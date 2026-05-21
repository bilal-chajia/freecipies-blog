import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

type RelatedContentContextValue = {
    categorySlug: string | null;
    tagSlugs: string[];
    currentSlug: string | null;
};

const RelatedContentContext = createContext<RelatedContentContextValue>({
    categorySlug: null,
    tagSlugs: [],
    currentSlug: null,
});

export const RelatedContentProvider = ({ value, children }: {
    value: RelatedContentContextValue;
    children: ReactNode;
}) => (
    <RelatedContentContext.Provider value={value}>
        {children}
    </RelatedContentContext.Provider>
);

export const useRelatedContentContext = () => useContext(RelatedContentContext);
