export type AssetCode = 'xlm' | 'usdc';

const ASSET_META: Record<AssetCode, { src: string; label: string }> = {
    xlm: { src: '/assets/xlm.svg', label: 'XLM' },
    usdc: { src: '/assets/usdc.svg', label: 'USDC' },
};

/** Normalize API / form values (xlm, usdc, usd, XLM, …) to a supported asset code. */
export function normalizeAsset(asset: string): AssetCode {
    const a = asset.toLowerCase();
    if (a === 'usdc' || a === 'usd') return 'usdc';
    return 'xlm';
}

export function assetDisplayLabel(asset: string): string {
    return ASSET_META[normalizeAsset(asset)].label;
}

export function assetIconSrc(asset: string): string {
    return ASSET_META[normalizeAsset(asset)].src;
}

export const ASSET_ICON_SIZES = { xs: 20, sm: 24, md: 32, lg: 40 } as const;

export type AssetIconSize = keyof typeof ASSET_ICON_SIZES;
