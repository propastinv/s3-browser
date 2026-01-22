export interface BucketConfig {
    id: string;
    provider: string;
    bucket: string;
    region: string;
    endpoint: string;
    forcePathStyle?: boolean;
    group: string;
    accessKeyId: string;
    secretAccessKey: string;
}

export interface BucketObject {
    type: "file" | "folder"
    key: string
    lastModified: string
    size?: number
}

export interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    file?: BucketObject;
}