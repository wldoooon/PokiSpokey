"use client"

import { useEffect } from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"

const TOUR_KEY = "vl_tour_done"

const steps = [
  {
    element: "#tour-search",
    popover: {
      title: "Search anything",
      description: "Type any word or phrase to find real clips from movies, podcasts, shows and more.",
      side: "bottom" as const,
      align: "center" as const,
    },
  },
  {
    element: "#tour-language",
    popover: {
      title: "Pick your language",
      description: "Switch between English, Spanish, French, German and more.",
      side: "bottom" as const,
      align: "end" as const,
    },
  },
  {
    element: "#tour-category",
    popover: {
      title: "Filter by category",
      description: "Narrow results to Movies, Podcasts, Shows, Talks and more.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
]

export function AppTour({ ready }: { ready: boolean }) {
  useEffect(() => {
    if (!ready) return
    if (typeof window === "undefined") return
    if (localStorage.getItem(TOUR_KEY)) return

    // Small delay so all elements are painted
    const timer = setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        progressText: "{{current}} / {{total}}",
        nextBtnText: "Next →",
        prevBtnText: "← Back",
        doneBtnText: "Got it!",
        onDestroyed: () => {
          localStorage.setItem(TOUR_KEY, "1")
        },
        steps,
      })
      driverObj.drive()
    }, 800)

    return () => clearTimeout(timer)
  }, [ready])

  return null
}

export function startTour() {
  localStorage.removeItem(TOUR_KEY)
  const driverObj = driver({
    showProgress: true,
    progressText: "{{current}} / {{total}}",
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    doneBtnText: "Got it!",
    onDestroyed: () => {
      localStorage.setItem(TOUR_KEY, "1")
    },
    steps,
  })
  driverObj.drive()
}
