// File: clickHearts.js
// == README ==
// This script is designed to automate clicking "unfilled heart" icons on dynamic-loading web pages,
// specifically tested with Upper Deck e-Pack collection pages.
//
// How to Use (Recommended Method with Puppeteer):
// 1. Ensure you have the Puppeteer MCP server running (github.com/modelcontextprotocol/servers/tree/main/src/puppeteer).
// 2. Use an external tool/agent (like Cline) to:
//    a. Navigate to the target webpage (e.g., an Upper Deck e-Pack collection page) using the
//       `puppeteer_navigate` tool. The URL used in testing was:
//       https://www.upperdeckepack.com/Collection/?filters=no_&search=2024-25%20Upper%20Deck%20Series%201%20Hockey%20Purple%20Parallel
//    b. Manually log in to the website within the Puppeteer-controlled browser window if required.
//    c. Manually scroll down the page in the Puppeteer window until the first set of items
//       with "unfilled hearts" you want to target are visible.
//    d. Inform the external tool/agent that you are ready.
//    e. The external tool/agent will then execute this entire script using the `puppeteer_evaluate` tool.
//       The script includes a 5-second delay before starting its main operations to allow the page to settle.
// 3. Observe the console output in the Puppeteer browser (or relayed by the MCP server) for progress.
//
// Script Logic Overview:
// - It looks for heart icons with class 'i.ud.ud-heart' that do not have the class 'filled'.
// - It programmatically clicks these hearts.
// - It attempts to scroll the page down to load more items dynamically.
// - A MutationObserver is used to detect when new content (nodes) are added to the page after a scroll.
// - It employs an "aggressive scroll" strategy to try and ensure the bottom of the page is reached.
// - The script will stop if it performs a set number of scrolls without finding new hearts to click
//   or if it believes it has reached the bottom of the scrollable content.
//
// Original Console Execution (Less reliable for complex dynamic pages):
// - Paste this entire script into your browser's developer console on the target page.
// - Then type: `clickAllHearts();` (or `clickAllHeartsInternal()` if using the version with the timeout wrapper).
// == END README ==

async function clickAllHearts() { // Renaming the main function to avoid conflict if pasted directly with the timeout wrapper
    const delayBetweenClicks = 100; // Delay between clicks
    const mutationCheckTimeout = 7000; // Increased Time to wait for mutations after scroll
    const maxScrollsWithoutNewHearts = 4; // Stop if no new hearts found after this many scrolls
    const aggressiveScrollPause = 300; // Pause during aggressive scroll attempts for page to react
    const maxAggressiveScrollAttemptsAtBottom = 3; // How many times to try scrolling when it seems stuck at bottom

    console.log('clickAllHearts: Process starting now.');

    let scrollsWithoutNewHearts = 0;
    let totalHeartsClicked = 0;
    let observer;
    let mutationTimeoutId;

    let currentScrollOperation = {
        resolve: null,
        processedHeartsInCycle: false
    };

    async function processVisibleHearts() {
        const unfilledHearts = document.querySelectorAll('i.ud.ud-heart:not(.filled)');
        console.log(`processVisibleHearts: Found ${unfilledHearts.length} unfilled hearts.`);
        if (unfilledHearts.length === 0) {
            return 0;
        }

        let heartsClickedInThisPass = 0;
        for (const heartIcon of unfilledHearts) {
            if (heartIcon.offsetParent === null || heartIcon.classList.contains('filled')) {
                // console.log('Skipping heart (not visible or already filled):', heartIcon);
                continue;
            }
            try {
                heartIcon.click();
                console.log('Clicked heart:', heartIcon);
                totalHeartsClicked++;
                heartsClickedInThisPass++;
                await new Promise(resolve => setTimeout(resolve, delayBetweenClicks));
            } catch (e) {
                console.error('Error clicking heart:', heartIcon, e);
            }
        }
        return heartsClickedInThisPass;
    }

    const mutationCallback = async (mutationsList, obs) => {
        let relevantMutationDetected = false;
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                const hasNonScriptOrStyleNodes = Array.from(mutation.addedNodes).some(
                    node => node.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE', 'LINK'].includes(node.tagName)
                );
                if (hasNonScriptOrStyleNodes) {
                    relevantMutationDetected = true;
                    break;
                }
            }
        }

        if (relevantMutationDetected) {
            console.log('MutationObserver: Detected new relevant nodes.');
            if (currentScrollOperation.resolve) {
                 clearTimeout(mutationTimeoutId);
            }

            await new Promise(resolve => setTimeout(resolve, 300)); 

            let heartsClickedByObserver = await processVisibleHearts();
            if (heartsClickedByObserver > 0) {
                console.log(`MutationObserver: Processed ${heartsClickedByObserver} hearts.`);
                currentScrollOperation.processedHeartsInCycle = true;
            } else {
                console.log('MutationObserver: Detected new nodes, but no new hearts were processed.');
            }

            if (currentScrollOperation.resolve) {
                currentScrollOperation.resolve();
            }
        }
    };

    observer = new MutationObserver(mutationCallback);
    console.log('Starting heart clicking process (after initial manual scroll by user)...');

    let heartsProcessedInitially = await processVisibleHearts();
    if (heartsProcessedInitially > 0) {
        console.log(`Processed ${heartsProcessedInitially} hearts on initial (post-manual-scroll) load.`);
        scrollsWithoutNewHearts = 0;
    } else {
        console.log('No hearts found on initial (post-manual-scroll) load. This might be okay if all visible were already filled.');
        // scrollsWithoutNewHearts = 1; // Don't increment yet, let the scroll logic try first
    }

    while (scrollsWithoutNewHearts < maxScrollsWithoutNewHearts) {
        const scrollElement = document.querySelector('.infinite-scroll.scrolling-grid') || document.documentElement;
        const isWindowScroll = scrollElement.isSameNode(document.documentElement);
        // console.log(`Scroll element: ${scrollElement.tagName}, isWindowScroll: ${isWindowScroll}`);
        // console.log(`ScrollTop: ${isWindowScroll ? window.scrollY : scrollElement.scrollTop}, ClientHeight: ${isWindowScroll ? window.innerHeight : scrollElement.clientHeight}, ScrollHeight: ${isWindowScroll ? document.body.scrollHeight : scrollElement.scrollHeight}`);
        
        let canStillScroll = isWindowScroll ? 
                             (window.innerHeight + window.scrollY < document.body.scrollHeight - 5) : // Reduced buffer slightly
                             (scrollElement.scrollTop + scrollElement.clientHeight < scrollElement.scrollHeight - 5);
        // console.log(`Can still scroll: ${canStillScroll}`);

        if (!canStillScroll) {
            console.log(\"Loop start: Initial check suggests we might be at the bottom or cannot scroll further.\");
            let heartsFoundAtBottomCheck = await processVisibleHearts();
            if (heartsFoundAtBottomCheck > 0) {
                console.log(`Found ${heartsFoundAtBottomCheck} hearts after initial bottom check.`);
                scrollsWithoutNewHearts = 0; 
            } else {
                console.log(\"No additional hearts found at what seems to be the bottom.\");
                if (!currentScrollOperation.processedHeartsInCycle) scrollsWithoutNewHearts++;
            }
            if (scrollsWithoutNewHearts >= maxScrollsWithoutNewHearts) {
                console.log(\"Breaking loop: Max scrolls without new hearts reached after bottom check.\");
                break; 
            }
        }

        console.log(\"Attempting aggressive scroll to ensure page bottom is reached...\");
        let previousScrollTopForAggressiveScroll = -1;
        let aggressiveScrollAttempts = 0;
        let actualScrollHappenedInAggressiveLoop = false;

        while (aggressiveScrollAttempts < maxAggressiveScrollAttemptsAtBottom) {
            previousScrollTopForAggressiveScroll = isWindowScroll ? window.scrollY : scrollElement.scrollTop;
            
            if (isWindowScroll) {
                window.scrollTo(0, document.body.scrollHeight + 1000); 
            } else {
                scrollElement.scrollTop = scrollElement.scrollHeight + 1000;
            }
            
            await new Promise(resolve => setTimeout(resolve, aggressiveScrollPause)); 

            const newScrollTop = isWindowScroll ? window.scrollY : scrollElement.scrollTop;
            if (newScrollTop <= previousScrollTopForAggressiveScroll + 5) { // Allow for minor scroll jitter
                aggressiveScrollAttempts++;
                console.log(`Aggressive scroll: Position effectively unchanged (at ${newScrollTop}), attempt ${aggressiveScrollAttempts}/${maxAggressiveScrollAttemptsAtBottom}.`);
            } else {
                aggressiveScrollAttempts = 0; 
                console.log(`Aggressive scroll: Scrolled from ${previousScrollTopForAggressiveScroll} to ${newScrollTop}.`);
                actualScrollHappenedInAggressiveLoop = true;
            }
            
            const currentScrollHeight = isWindowScroll ? document.body.scrollHeight : scrollElement.scrollHeight;
            const currentClientHeight = isWindowScroll ? window.innerHeight : scrollElement.clientHeight;
            if (newScrollTop + currentClientHeight >= currentScrollHeight - 5) {
                 console.log(\"Aggressive scroll: Reached effective bottom based on scrollHeight.\");
                 if (newScrollTop <= previousScrollTopForAggressiveScroll + 5) {
                     break;
                 }\
            }
        }
        console.log(\"Finished aggressive scroll attempts.\");
        if (!actualScrollHappenedInAggressiveLoop && scrollsWithoutNewHearts > 0) {
             const finalScrollTop = isWindowScroll ? window.scrollY : scrollElement.scrollTop;
             const finalScrollHeight = isWindowScroll ? document.body.scrollHeight : scrollElement.scrollHeight;
             const finalClientHeight = isWindowScroll ? window.innerHeight : scrollElement.clientHeight;
             if (finalScrollTop + finalClientHeight >= finalScrollHeight - 5) {\
                console.log(\"Aggressive scroll confirmed: No scroll movement and appears to be at the bottom.\");
             } else {
                console.log(\"Aggressive scroll warning: No scroll movement, but scrollHeight suggests more content. Page might be unresponsive to scrolls.\");
             }\
        }
        
        currentScrollOperation.processedHeartsInCycle = false; 
        const observerTargetNode = document.querySelector('.infinite-scroll.scrolling-grid') || document.body;
        
        observer.observe(observerTargetNode, { childList: true, subtree: true });
        console.log('MutationObserver is now watching for new content...');

        await new Promise(resolve => {
            currentScrollOperation.resolve = resolve;
            mutationTimeoutId = setTimeout(() => {
                console.log('MutationObserver: Timeout waiting for mutations.');
                if (currentScrollOperation.resolve) currentScrollOperation.resolve(); 
            }, mutationCheckTimeout);
        });

        observer.disconnect(); 
        console.log('MutationObserver stopped watching.');
        currentScrollOperation.resolve = null; 

        if (currentScrollOperation.processedHeartsInCycle) {
            scrollsWithoutNewHearts = 0;
        } else {
            console.log(\"Observer cycle ended. Explicitly re-checking for hearts.\");
            let heartsAfterCycle = await processVisibleHearts();
            if (heartsAfterCycle > 0) {
                console.log(`Found ${heartsAfterCycle} hearts in explicit check after observer cycle.`);
                scrollsWithoutNewHearts = 0;
            } else {
                console.log(\"No hearts found in explicit check after observer cycle.\");
                scrollsWithoutNewHearts++;
            }\
        }
        console.log(`Scrolls without new hearts: ${scrollsWithoutNewHearts}/${maxScrollsWithoutNewHearts}`);
    }

    observer.disconnect(); 
    console.log(`Finished. Total hearts clicked: ${totalHeartsClicked}.`);
    if (scrollsWithoutNewHearts >= maxScrollsWithoutNewHearts) {
        console.log(`Stopped after ${scrollsWithoutNewHearts} scroll attempts without new hearts or reaching bottom.`);
    } else {
        console.log(\"Stopped because no more scrollable content was detected or loop completed naturally.\");
    }
    return `Total hearts clicked: ${totalHeartsClicked}`;\
}

// The following is for direct execution via puppeteer_evaluate, which includes a delay.
// If pasting into console directly, just call clickAllHearts();
// console.log('Script defined. Setting timeout to call clickAllHearts...');
// setTimeout(() => {
//    console.log('Timeout finished. Calling clickAllHearts now.');
//    clickAllHearts().then(result => console.log('clickAllHearts promise resolved:', result)).catch(err => console.error('clickAllHearts promise rejected:', err));
// }, 5000);

// To run, open your browser's developer console on the page,
// paste this entire script (including the README if you like), and then type:
// clickAllHearts();
// Or, if using the delayed execution for Puppeteer, the script will self-invoke the internal version.
