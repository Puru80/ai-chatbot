import useSWR, { useSWRConfig } from 'swr';
import { updateChatTitle } from '@/app/(chat)/actions';

export function useChatTitle({
                                 chatId,
                                 initialTitle,
                             }: {
    chatId: string;
    initialTitle: string;
}) {
    // const { mutate, cache } = useSWRConfig();
    const { data: title, mutate: setTitle } = useSWR(
        `${chatId}-title`,
        null,
        { fallbackData: initialTitle }
    );

    const updateTitle = (updatedTitle: string) => {
        setTitle(updatedTitle);
        // Optionally mutate chat history cache if needed
        updateChatTitle({ chatId, title: updatedTitle });
    };

    return { title: title, setTitle: updateTitle };
}
