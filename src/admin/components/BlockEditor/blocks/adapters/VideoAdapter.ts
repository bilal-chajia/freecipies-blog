import type { BlockAdapter } from '../BlockAdapter';
import type { VideoBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';

export const VideoAdapter: BlockAdapter<VideoBlock> = {
    type: 'video',

    toEditor(block) {
        return {
            type: 'video',
            props: {
                url: block.video_id ? `https://www.youtube.com/watch?v=${block.video_id}` : '',
                provider: block.provider || '',
                videoId: block.video_id || '',
                aspectRatio: block.aspect_ratio || '16:9',
            },
        };
    },

    fromEditor(block: AppBlock): VideoBlock | null {
        const props = block.props as Record<string, unknown>;
        const provider = props.provider as 'youtube' | 'vimeo' | 'self' | undefined;
        const videoId = String(props.videoId || '');
        if (!provider || !videoId) return null;
        return {
            type: 'video',
            provider,
            video_id: videoId,
            aspect_ratio: (props.aspectRatio as '16:9' | '4:3' | '1:1' | '9:16') || '16:9',
        };
    },
};
