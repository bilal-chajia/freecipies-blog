// HSL tailored colors for visual indicators
export function getBlockColorClass(type: string): string {
    switch (type) {
        case 'paragraph': return 'text-sky-500 bg-sky-500/10 border-sky-500/20';
        case 'heading': return 'text-violet-500 bg-violet-500/10 border-violet-500/20';
        case 'list': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        case 'quote': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        case 'code': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
        case 'customImage': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        case 'video': return 'text-red-500 bg-red-500/10 border-red-500/20';
        case 'beforeAfter': return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20';
        case 'alert': return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20';
        case 'faqSection': return 'text-teal-500 bg-teal-500/10 border-teal-500/20';
        case 'simpleTable': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
        case 'relatedContent': return 'text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20';
        case 'divider': return 'text-muted-foreground bg-muted border-border/20';
        case 'mainRecipe': return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
        default: return 'text-primary bg-primary/10 border-primary/20';
    }
}

// HSL tailored colors for heading level outline badges (H1-H6)
export function getHeadingBadgeColorClass(level: number): string {
    switch (level) {
        case 1: return 'border-rose-500/20 bg-rose-500/10 text-rose-500 dark:text-rose-400';
        case 2: return 'border-violet-500/20 bg-violet-500/10 text-violet-500 dark:text-violet-400';
        case 3: return 'border-indigo-500/20 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400';
        case 4: return 'border-sky-500/20 bg-sky-500/10 text-sky-500 dark:text-sky-400';
        case 5: return 'border-teal-500/20 bg-teal-500/10 text-teal-500 dark:text-teal-400';
        case 6: return 'border-amber-500/20 bg-amber-500/10 text-amber-500 dark:text-amber-400';
        default: return 'border-primary/15 bg-primary/5 text-primary';
    }
}
