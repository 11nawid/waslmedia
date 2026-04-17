export type UploadStep = 'select' | 'details' | 'elements' | 'checks' | 'visibility' | 'published';
export type UploadStepState = 'complete' | 'warning' | 'error' | 'active' | 'pending';

function getStepStateClasses(state: UploadStepState) {
  switch (state) {
    case 'complete':
      return {
        label: 'text-emerald-500',
        bar: 'bg-emerald-500',
      };
    case 'warning':
      return {
        label: 'text-amber-500',
        bar: 'bg-amber-500',
      };
    case 'error':
      return {
        label: 'text-rose-500',
        bar: 'bg-rose-500',
      };
    case 'active':
      return {
        label: 'text-primary',
        bar: 'bg-primary',
      };
    default:
      return {
        label: 'text-muted-foreground group-hover:text-foreground',
        bar: 'bg-muted',
      };
  }
}

export function UploadDialogStepper({
  currentStep,
  setStep,
  isComplete,
  stepStates,
}: {
  currentStep: UploadStep;
  setStep: (step: UploadStep) => void;
  isComplete: boolean;
  stepStates?: Partial<Record<UploadStep, UploadStepState>>;
}) {
  const steps: { id: UploadStep; name: string }[] = [
    { id: 'details', name: 'Details' },
    { id: 'elements', name: 'Video elements' },
    { id: 'checks', name: 'Checks' },
    { id: 'visibility', name: 'Visibility' },
  ];

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <div className="flex justify-between items-center mb-8">
      {steps.map((step, index) => (
        <button
          key={step.id}
          onClick={() => isComplete && setStep(step.id)}
          className="step-item flex-1 text-center group rounded-2xl px-2 py-2 transition-colors"
          disabled={!isComplete}
        >
          <span className={`text-sm ${getStepStateClasses(stepStates?.[step.id] || (index === currentStepIndex ? 'active' : index < currentStepIndex ? 'complete' : 'pending')).label}`}>
            {step.name}
          </span>
          <div className={`h-1.5 mt-2 mx-auto rounded-full ${getStepStateClasses(stepStates?.[step.id] || (index === currentStepIndex ? 'active' : index < currentStepIndex ? 'complete' : 'pending')).bar}`} />
        </button>
      ))}
    </div>
  );
}

export const uploadCategories = [
  'Film & Animation',
  'Autos & Vehicles',
  'Music',
  'Pets & Animals',
  'Sports',
  'Travel & Events',
  'Gaming',
  'People & Blogs',
  'Comedy',
  'Entertainment',
  'News & Politics',
  'Howto & Style',
  'Education',
  'Science & Technology',
  'Nonprofits & Activism',
  'Movies',
  'Anime/Animation',
  'Action/Adventure',
  'Classics',
  'Documentary',
  'Drama',
  'Family',
  'Foreign',
  'Horror',
  'Sci-Fi/Fantasy',
  'Thriller',
  'Shorts',
];
