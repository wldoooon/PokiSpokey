export interface CategoryItem {
    value: string
    label: string
}

export const ENGLISH_CATEGORIES: CategoryItem[] = [
    { value: "All", label: "All" },
    { value: "Movies", label: "Movies" },
    { value: "Shows", label: "Shows" },
    { value: "Podcasts", label: "Podcasts" },
]

export const GERMAN_CATEGORIES: CategoryItem[] = [
    { value: "All", label: "All" },
    { value: "Podcasts", label: "Podcasts" },
    { value: "News", label: "News" },
    { value: "Cartoons", label: "Cartoons" },
]

export const SPANISH_CATEGORIES: CategoryItem[] = [
    { value: "All", label: "All" },
    { value: "Podcasts", label: "Podcasts" },
    { value: "Shows", label: "Shows" },
    { value: "Movies", label: "Movies" },
]

export const FRENCH_CATEGORIES: CategoryItem[] = [
    { value: "All", label: "All" },
    { value: "Podcasts", label: "Podcasts" },
    { value: "Movies", label: "Movies" },
]

export const CATEGORIES_BY_LANGUAGE: Record<string, CategoryItem[]> = {
    english: ENGLISH_CATEGORIES,
    germany: GERMAN_CATEGORIES,
    spanish: SPANISH_CATEGORIES,
    french: FRENCH_CATEGORIES,
}

export function getCategoriesForLanguage(language: string): CategoryItem[] {
    return CATEGORIES_BY_LANGUAGE[language.toLowerCase()] ?? ENGLISH_CATEGORIES
}
