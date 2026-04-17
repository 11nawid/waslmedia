import type { Playlist } from '@/lib/types';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { ListVideo, Lock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { getUserPlaylists } from '@/server/services/playlists';


function MainContent({children}: {children: React.ReactNode}) {
  return (
     <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
    return (
        <Link href={`/playlist/${playlist.id}`} className="block group">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-secondary">
                {playlist.firstVideoThumbnail ? (
                    <Image src={playlist.firstVideoThumbnail} alt={playlist.name} fill sizes="320px" className="object-cover" />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <ListVideo className="w-12 h-12 text-muted-foreground" />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white font-semibold">VIEW PLAYLIST</p>
                </div>
            </div>
            <h3 className="font-semibold mt-2">{playlist.name}</h3>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span>{playlist.videoCount} videos</span>
                {playlist.visibility === 'private' && <Lock className="w-4 h-4" />}
            </div>
        </Link>
    )
}

export default async function PlaylistsPage() {
    await ensureDatabaseSetup();
    const user = await getCurrentAuthUser();
    const playlists: Playlist[] = user ? await getUserPlaylists(user.id) : [];

    if (!user) {
        return (
            <MainContent>
                <div className="text-center">Please sign in to view your playlists.</div>
            </MainContent>
        )
    }

    return (
        <MainContent>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Playlists</h1>
            </div>
            
            {playlists.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {playlists.map(playlist => <PlaylistCard key={playlist.id} playlist={playlist} />)}
                </div>
            ) : (
                <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/45">
                    <ListVideo className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="max-w-xl text-xl font-semibold tracking-tight text-foreground">No playlists yet</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    Create your first playlist to organize favorite videos, ideas, and future uploads.
                  </p>
                </div>
            )}
        </MainContent>
    )
}
