import type {Chat} from '@/lib/db/schema';
import {
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
} from './ui/sidebar';
import Link from 'next/link';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
    CheckCircleFillIcon,
    EditIcon,
    GlobeIcon,
    LockIcon,
    MoreHorizontalIcon,
    ShareIcon,
    TrashIcon,
} from './icons';
import React, {memo, useState} from 'react';
import {useChatVisibility} from '@/hooks/use-chat-visibility';
import {useChatTitle} from "@/hooks/use-chat-title";

const PureChatItem = ({
                          chat,
                          isActive,
                          onDelete,
                          setOpenMobile,
                          // onEdit,
                      }: {
    chat: Chat;
    isActive: boolean;
    onDelete: (chatId: string) => void;
    setOpenMobile: (open: boolean) => void;
    // onEdit?: (chatId: string, newTitle: string) => void;
}) => {
    const {visibilityType, setVisibilityType} = useChatVisibility({
        chatId: chat.id,
        initialVisibilityType: chat.visibility,
    });

    const { title, setTitle } = useChatTitle({
        chatId: chat.id,
        initialTitle: chat.title,
    });

    const [editOpen, setEditOpen] = useState(false);
    const [newTitle, setNewTitle] = useState(title);

    const handleEdit = () => {
        setEditOpen(true);
        setNewTitle(title);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTitle(newTitle.trim());
        setEditOpen(false);
    };

    const handleCancel = () => {
        setEditOpen(false);
        setNewTitle(title);
    };

    return (
        <>
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive}>
                    <Link href={`/chat/${chat.id}`} onClick={() => setOpenMobile(false)}>
                        <span>{title}</span>
                    </Link>
                </SidebarMenuButton>

                <DropdownMenu modal={true}>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuAction
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mr-0.5"
                            showOnHover={!isActive}
                        >
                            <MoreHorizontalIcon/>
                            <span className="sr-only">More</span>
                        </SidebarMenuAction>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent side="bottom" align="end">
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="cursor-pointer">
                                <ShareIcon/>
                                <span>Share</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem
                                        className="cursor-pointer flex-row justify-between"
                                        onClick={() => {
                                            setVisibilityType('private');
                                        }}
                                    >
                                        <div className="flex flex-row gap-2 items-center">
                                            <LockIcon size={12}/>
                                            <span>Private</span>
                                        </div>
                                        {visibilityType === 'private' ? (
                                            <CheckCircleFillIcon/>
                                        ) : null}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="cursor-pointer flex-row justify-between"
                                        onClick={() => {
                                            setVisibilityType('public');
                                        }}
                                    >
                                        <div className="flex flex-row gap-2 items-center">
                                            <GlobeIcon/>
                                            <span>Public</span>
                                        </div>
                                        {visibilityType === 'public' ? <CheckCircleFillIcon/> : null}
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>

                        <DropdownMenuItem
                          className="cursor-pointer"
                          onSelect={handleEdit}
                        >
                            <EditIcon/>
                            <span>Edit </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
                            onSelect={() => onDelete(chat.id)}
                        >
                            <TrashIcon/>
                            <span>Delete</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>

            {editOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <form
                        className="bg-white dark:bg-gray-900 p-4 rounded shadow flex flex-col gap-2 min-w-[300px]"
                        onSubmit={handleEditSubmit}
                    >
                        <label className="font-semibold">Edit chat name</label>
                        <input
                            className="border rounded px-2 py-1"
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700"
                                onClick={handleCancel}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-3 py-1 rounded bg-blue-600 text-white"
                                // onClick={handleEditSubmit}
                            >
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};

export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
    return prevProps.isActive === nextProps.isActive;

});
