
import React, { useEffect, useRef } from 'react';
import { TooltipRenderProps } from 'react-joyride';

const TutorialTooltip = ({
    index,
    size,
    step,
    backProps,
    primaryProps,
    skipProps,
    tooltipProps,
    isLastStep,
}: TooltipRenderProps) => {
    
    // Access translations passed via step.data
    const labels = step.data?.translations || {};
    const primaryLabel: string = isLastStep ? (step.data?.isTutorial ? (labels.finishBtn || 'Finish') : (labels.ok || 'OK')) : (labels.next || 'Next');
    const exitLabel: string = step.data?.isTutorial ? (labels.exit || 'Exit Tutorial') : (labels.close || 'Close');

    // 1. Define the action logic closing over current props
    const performDismiss = (e?: React.MouseEvent<HTMLElement>, persist: boolean = true) => {
        if (persist) {
            // Main Tutorial Logic
            if (step.data?.isTutorial) {
                 localStorage.setItem('tutorial_dismissed', 'true');
            } 
            // JIT Hint Logic - Persist only on manual dismissal
            else if (step.data?.storageKey) {
                 localStorage.setItem(step.data.storageKey, 'true');
            }
        }
        
        const safeEvent = e || { 
            preventDefault: () => {}, 
            stopPropagation: () => {},
            currentTarget: { blur: () => {} }
        } as any;

        if (skipProps && typeof skipProps.onClick === 'function') {
            skipProps.onClick(safeEvent);
        }
    };

    const handlePrimaryClick = (e: React.MouseEvent<HTMLElement>) => {
        // For JIT hints (single step), treat "OK" as a dismissal to ensure it closes reliably.
        if (!step.data?.isTutorial && isLastStep) {
            performDismiss(e, true);
        } else {
            // For the main linear tutorial or multi-step JIT, use the standard navigation
            primaryProps.onClick(e);
        }
    };

    // 2. Use a ref to keep the latest version of the action accessible to the timer
    const dismissRef = useRef(performDismiss);
    
    // Update ref on every render so the timer always calls the fresh function with fresh props
    useEffect(() => {
        dismissRef.current = performDismiss;
    });

    // 3. Set up the timer ONCE on mount
    useEffect(() => {
        // Do not auto-dismiss the main tutorial steps
        if (step.data?.isTutorial) return;

        const timer = setTimeout(() => {
            // Call the latest version of the function
            if (dismissRef.current) {
                // Soft dismissal: persist=false. 
                // If the user hasn't interacted, we hide it but don't mark it as seen forever.
                dismissRef.current(undefined, false);
            }
        }, 15000); // 15 seconds (increased for multi-step readability)

        return () => clearTimeout(timer);
    }, []); 
  
    return (
      <div {...tooltipProps} data-tutorial-tooltip="" className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 sm:p-5 min-w-[min(18rem,calc(100vw-2rem))] max-w-[min(24rem,calc(100vw-2rem))] border border-gray-200 dark:border-gray-700 flex flex-col gap-3 sm:gap-4 relative z-50">
         {size > 1 && (
             // "Step 3 of 10": people can see how far along they are (row 62).
             <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 -mb-2" data-testid="tour-progress">
                 {(step.data?.isTutorial ? (labels.stepOf || 'Step {current} of {total}') : (labels.tipOf || '{current} of {total}'))
                     .replace('{current}', String(index + 1)).replace('{total}', String(size))}
             </p>
         )}
         <div className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-line">
           {step.content}
         </div>
         
         <div className="flex flex-col gap-3 mt-2">
              <div className="flex justify-between items-center">
                   <div className="flex items-center">
                      {!isLastStep && (
                           <button {...skipProps} onClick={(e) => performDismiss(e, true)}
                               // Its name is what it says (Joyride would call it "Skip Tutorial").
                               aria-label={exitLabel} title={exitLabel}
                               className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-xs font-bold uppercase tracking-wider transition-colors">
                               {exitLabel}
                           </button>
                      )}
                   </div>
                   <div className="flex gap-2">
                       {index > 0 && (
                          <button {...backProps} aria-label={labels.back || 'Back'} title={labels.back || 'Back'} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                             {labels.back || 'Back'}
                          </button>
                       )}
                       {!step.hideFooter && (
                           <button 
                                {...primaryProps} 
                                aria-label={primaryLabel} title={primaryLabel}
                                onClick={handlePrimaryClick}
                                className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                           >
                              {primaryLabel}
                           </button>
                       )}
                   </div>
              </div>
         </div>
      </div>
    );
};

export default TutorialTooltip;
