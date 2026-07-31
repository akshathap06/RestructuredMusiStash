import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Aspect ratio constraints
// Min = widest landscape allowed (1.91:1 → height/width ≈ 0.524)
const MIN_ASPECT_RATIO = 1 / 1.91; // ~0.524 (landscape)

// Max height for any image = 55% of screen height
// This ensures you always see the post header, actions, caption, and nav
const MAX_IMAGE_HEIGHT = SCREEN_HEIGHT * 0.55;
const MAX_ASPECT_RATIO = MAX_IMAGE_HEIGHT / SCREEN_WIDTH;

const DEFAULT_ASPECT_RATIO = 1; // square fallback

interface AdaptiveImageProps {
  uri: string;
  /** Pre-known width of image (skips Image.getSize if both width & height provided) */
  imageWidth?: number;
  /** Pre-known height of image (skips Image.getSize if both width & height provided) */
  imageHeight?: number;
  /** Width of the container (defaults to screen width) */
  containerWidth?: number;
  /** Custom resizeMode */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  /** Background color while loading */
  backgroundColor?: string;
  /** Show loading indicator */
  showLoading?: boolean;
  /** Callback when dimensions are resolved */
  onDimensionsResolved?: (width: number, height: number) => void;
}

export default function AdaptiveImage({
  uri,
  imageWidth,
  imageHeight,
  containerWidth = SCREEN_WIDTH,
  resizeMode = 'cover',
  backgroundColor = '#1C1C1E',
  showLoading = true,
  onDimensionsResolved,
}: AdaptiveImageProps) {
  const [aspectRatio, setAspectRatio] = useState<number>(
    imageWidth && imageHeight ? clampAspectRatio(imageHeight / imageWidth) : DEFAULT_ASPECT_RATIO
  );
  const [loading, setLoading] = useState(!imageWidth || !imageHeight);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (imageWidth && imageHeight && imageWidth > 0 && imageHeight > 0) {
      const ratio = clampAspectRatio(imageHeight / imageWidth);
      setAspectRatio(ratio);
      setLoading(false);
      return;
    }

    if (!uri) {
      setLoading(false);
      return;
    }

    // Fetch dimensions from remote image
    let cancelled = false;

    Image.getSize(
      uri,
      (w, h) => {
        if (cancelled) return;
        const ratio = clampAspectRatio(h / w);
        setAspectRatio(ratio);
        setLoading(false);
        onDimensionsResolved?.(w, h);
      },
      (err) => {
        if (cancelled) return;
        console.warn('AdaptiveImage: Failed to get image size', err);
        setAspectRatio(DEFAULT_ASPECT_RATIO);
        setLoading(false);
        setError(true);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [uri, imageWidth, imageHeight]);

  const computedHeight = containerWidth * aspectRatio;

  return (
    <View
      style={[
        styles.container,
        {
          width: containerWidth,
          height: computedHeight,
          backgroundColor,
        },
      ]}
    >
      {loading && showLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode={resizeMode}
          onError={() => setError(true)}
        />
      )}
    </View>
  );
}

/**
 * Clamp the height/width ratio:
 * - Landscape: max 1.91:1 (height/width >= ~0.524)
 * - Portrait: capped so image never exceeds 55% of screen height
 * - Square: 1:1 stays as-is
 */
function clampAspectRatio(heightOverWidth: number): number {
  return Math.min(Math.max(heightOverWidth, MIN_ASPECT_RATIO), MAX_ASPECT_RATIO);
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
