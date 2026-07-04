import { assetDisplayLabel, assetIconSrc, ASSET_ICON_SIZES, type AssetIconSize } from '@/lib/assets';

type AssetIconProps = {
    asset: string;
    size?: AssetIconSize;
    className?: string;
};

export function AssetIcon({ asset, size = 'md', className = '' }: AssetIconProps) {
    const px = ASSET_ICON_SIZES[size];
    const src = assetIconSrc(asset);
    const label = assetDisplayLabel(asset);

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={label}
            width={px}
            height={px}
            className={`shrink-0 rounded-full object-cover ${className}`}
            loading="lazy"
            decoding="async"
        />
    );
}

type AssetLabelProps = {
    asset: string;
    size?: AssetIconSize;
    showName?: boolean;
    nameClassName?: string;
    className?: string;
};

export function AssetLabel({ asset, size = 'sm', showName = true, nameClassName = '', className = '' }: AssetLabelProps) {
    return (
        <span className={`inline-flex items-center gap-2 ${className}`}>
            <AssetIcon asset={asset} size={size} />
            {showName && <span className={nameClassName}>{assetDisplayLabel(asset)}</span>}
        </span>
    );
}
