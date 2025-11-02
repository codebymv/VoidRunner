Here is a guide on how to refactor the notification system to separate pickup-related toasts (like "Unlimited Ammo") from the main score notification queue.

This guide will create a new, separate toast queue that renders directly below the existing score notifications, so they don't get mixed in with each other.

Refactoring Guide: Creating a Separate Pickup Notification Queue
The goal is to modify the system so that:

Score Toasts (combos, points, etc.) continue to use the high-priority top-right queue.

Pickup Toasts ("Unlimited Ammo") will appear in a separate queue, visually stacked below the score toasts.

We will accomplish this by rendering a second sonner toaster instance that listens on a different position (top-center) and then using CSS to move that position to where we want it.

Step 1: Render a Second Toaster Instance for Pickups
First, we need to tell the app to render a second toast container. We will add this to the main App.tsx file.

In src/App.tsx:

TypeScript

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster as PickupToaster } from "sonner"; // <-- [!code ++]
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner /> {/* This is the existing 'top-right' toaster for scores */}
      
      {/* [!code ++] */}
      {/* This is the new toaster for pickups. We'll use 'top-center' as its ID. */}
      <PickupToaster 
        position="top-center" 
        theme="system"
        className="toaster group"
        toastOptions={{
          classNames: {
            toast:
              "group toast group-[.toaster]:bg-background/80 group-[.toaster]:backdrop-blur-sm group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
            description: "group-[.toast]:text-muted-foreground",
            actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          },
        }}
      />
      {/* [!code --] */}

      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
Step 2: Reposition the New Toaster with CSS
Now that we have a toaster at top-center, we need to use CSS to move it from the center and stack it below the top-right one.

In src/index.css:

CSS

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ... (existing styles) ... */

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-gradient-to-b from-background via-[hsl(240,30%,6%)] to-black text-foreground overflow-hidden;
  }

  /* [!code ++] */
  /* Reposition the 'top-center' toaster to act as our 'pickup' queue */
  [data-sonner-position="top-center"] > ol {
    /* Remove default centering */
    left: auto !important;
    transform: none !important;

    /* Position it top-right */
    top: 1rem; /* Match default top-right */
    right: 1rem; /* Match default top-right */

    /* This is the key: add a top margin to push it below the score toasts. */
    /* Adjust this value as needed. */
    margin-top: 80px; 
  }
  /* [!code --] */
}

/* ... (existing styles) ... */
Step 3: Reroute Pickup Notifications to the New Toaster
Finally, we update the "Unlimited Ammo" notification in GameCanvas.tsx to use the new toaster. We do this by importing toast directly from sonner and specifying position: "top-center" in the call. This removes it from the priorityToast queue entirely.

In src/components/GameCanvas.tsx:

TypeScript

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "./ui/button";
import { priorityToast, toastManager, formatToastWithCombo } from "@/utils/toastPriority";
import { toast } from "sonner"; // <-- [!code ++]
import { StarField } from "@/utils/StarField";
// ... (rest of imports)

// ... (inside GameCanvas component)

      // Ammo power-up collection
      game.ammoPowerUps.forEach(powerUp => {
        if (!powerUp.collected) {
          const dx = powerUp.x - game.ship.x;
          const dy = powerUp.y - game.ship.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < game.ship.radius + powerUp.radius) {
            powerUp.collected = true;
            setIsUnlimitedAmmo(true);
            setUnlimitedAmmoEndTime(Date.now() + UNLIMITED_AMMO_DURATION);
            setAmmo(100);
            setIsRecharging(false);
            playSound('unlimitedAmmo').catch(() => {}); // Play unlimited ammo pickup sound
            createParticles(powerUp.x, powerUp.y, "hsl(45, 100%, 50%)", 30);
            
            // [!code --]
            // This is the OLD call that uses the score queue. Remove it:
            // priorityToast("Unlimited Ammo!", 1000, {
            //   duration: 2000,
            //   className: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 font-bold shadow-lg'
            // });

            // [!code ++]
            // This is the NEW call. It targets the 'top-center' toaster directly.
            toast("Unlimited Ammo!", {
              position: "top-center",
              duration: 2000,
              className: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 font-bold shadow-lg'
            });
            // [!code --]
          }
        }
      });
Result
With these changes, your application now has two separate toast zones in the top-right corner:

Score Toasts: priorityToast calls do not specify a position, so they are caught by the default <Sonner /> component at position="top-right".

Pickup Toasts: The "Unlimited Ammo" call now uses toast(..., { position: "top-center" }), which is caught by our new <PickupToaster />. Our CSS then moves this top-center zone to be just below the top-right zone, achieving the stacked layout.
