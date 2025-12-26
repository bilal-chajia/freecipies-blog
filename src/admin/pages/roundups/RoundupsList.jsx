import ArticlesList from '../articles/ArticlesList';

/**
 * Roundups List Page
 * Wrapper that renders ArticlesList with type=roundup filter
 */
const RoundupsList = () => {
    return <ArticlesList fixedType="roundup" />;
};

export default RoundupsList;
