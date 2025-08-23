"use client";
import React from 'react';

interface StepperProps { steps: string[]; current: number; }
export const Stepper: React.FC<StepperProps> = ({ steps, current }) => {
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
};

export default Stepper;
