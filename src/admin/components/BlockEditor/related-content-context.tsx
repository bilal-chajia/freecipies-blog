import { createContext, useContext } from 'react';

const RelatedContentContext = createContext({
    categorySlug: null,
    tagSlugs: [],
    currentSlug: null,
});

export const RelatedContentProvider = ({ value, children }) => (
    <RelatedContentContext.Provider value={value}>
        {children}
    </RelatedContentContext.Provider>
);

export const useRelatedContentContext = () => useContext(RelatedContentContext);
