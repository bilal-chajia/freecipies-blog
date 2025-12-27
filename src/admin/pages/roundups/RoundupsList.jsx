import ContentListBase from '../../components/shared/ContentListBase';
import { Layers } from 'lucide-react';

const RoundupsList = () => {
    return (
        <ContentListBase
            contentType="roundup"
            title="Roundups"
            description="Curate collections of your best content."
            newButtonLabel="New Roundup"
            newButtonPath="/roundups/new"
            editPathPrefix="/roundups"
            editIdField="slug"
            livePathPrefix="/roundups"
            typeIcon={Layers}
            statsLabel="Total Roundups"
        />
    );
};

export default RoundupsList;
