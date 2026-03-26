import { BucketObject } from '@/types/bucket';

export interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    file?: BucketObject;
    refresh: () => Promise<void>;
}
