export type CreateAdStep = 'media' | 'details' | 'placement' | 'pricing' | 'published';
export type CreateAdStepState = 'complete' | 'warning' | 'error' | 'active' | 'pending';

function getStepStateClasses(state: CreateAdStepState) {
  switch (state) {
    case 'complete':
      return { label: 'text-emerald-500', bar: 'bg-emerald-500' };
    case 'warning':
      return { label: 'text-amber-500', bar: 'bg-amber-500' };
    case 'error':
      return { label: 'text-rose-500', bar: 'bg-rose-500' };
    case 'active':
      return { label: 'text-primary', bar: 'bg-primary' };
    default:
      return { label: 'text-muted-foreground group-hover:text-foreground', bar: 'bg-muted' };
  }
}

export function CreateAdDialogStepper({
  currentStep,
  setStep,
  furthestStepIndex,
  stepStates,
  orientation = 'horizontal',
}: {
  currentStep: CreateAdStep;
  setStep: (step: CreateAdStep) => void;
  furthestStepIndex: number;
  stepStates?: Partial<Record<CreateAdStep, CreateAdStepState>>;
  orientation?: 'horizontal' | 'vertical';
}) {
  const steps: { id: Exclude<CreateAdStep, 'published'>; name: string }[] = [
    { id: 'media', name: 'Media' },
    { id: 'details', name: 'Details' },
    { id: 'placement', name: 'Placement' },
    { id: 'pricing', name: 'Pricing' },
  ];

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  if (orientation === 'vertical') {
    return (
      <div className="space-y-2">
        {steps.map((step, index) => {
          const state =
            stepStates?.[step.id] ||
            (index === currentStepIndex ? 'active' : index < currentStepIndex ? 'complete' : 'pending');
          const isAccessible = index <= furthestStepIndex;
          return (
            <button
              key={step.id}
              onClick={() => isAccessible && setStep(step.id)}
              className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={!isAccessible}
            >
              <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${getStepStateClasses(state).bar}`} />
              <span className={`text-sm font-medium ${getStepStateClasses(state).label}`}>{step.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mb-8 flex items-center justify-between">
      {steps.map((step, index) => {
        const state =
          stepStates?.[step.id] ||
          (index === currentStepIndex ? 'active' : index < currentStepIndex ? 'complete' : 'pending');
        const isAccessible = index <= furthestStepIndex;
        return (
          <button
            key={step.id}
            onClick={() => isAccessible && setStep(step.id)}
            className="group flex-1 rounded-2xl px-2 py-2 text-center transition-colors"
            disabled={!isAccessible}
          >
            <span className={`text-sm ${getStepStateClasses(state).label}`}>{step.name}</span>
            <div className={`mx-auto mt-2 h-1.5 rounded-full ${getStepStateClasses(state).bar}`} />
          </button>
        );
      })}
    </div>
  );
}
