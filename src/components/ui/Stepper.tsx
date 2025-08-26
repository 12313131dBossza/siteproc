"use client";
import { ReactElement } from 'react';

interface StepperProps { steps: string[]; current: number; }
export function Stepper({ steps, current }: StepperProps): ReactElement {
  return (
    <div className="sp-stepper" role="list">
      {steps.map((s, i) => {
        const state = i < current ? 'complete' : i === current ? 'active' : '';
        return (
          <div key={s} className={`sp-step ${state}`} role="listitem" aria-current={state==='active' ? 'step' : undefined}>
            <span className="sp-step-number text-xs">{i < current ? '✓' : i + 1}</span>
            <span className="text-xs font-medium">{s}</span>
          </div>
        );
      })}
    </div>
  );
}

export default Stepper;
