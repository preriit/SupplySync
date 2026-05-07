import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DealerAppBar } from '../../../../components/DealerAppBar';
import { DealerBackButton } from '../../../../components/DealerBackButton';
import { DealerMenuSheet } from '../../../../components/DealerMenuSheet';
import { DealerTabBar } from '../../../../components/DealerTabBar';
import { api } from '../../../../lib/api';
import { FONT } from '../../../../theme/typography';

const SLATE = '#0F172A';
const MUTED = '#64748B';
const BRAND_ORANGE = '#EA580C';
const TXN_PREVIEW_LIMIT = 20;

function normalizeQty(input) {
  const qty = Number(input);
  if (!Number.isInteger(qty) || qty <= 0) {
    return null;
  }
  return qty;
}

function sortProductImages(list) {
  if (!list?.length) return [];
  return [...list].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (Number(a.ordering) || 0) - (Number(b.ordering) || 0);
  });
}

function resolveImageUrl(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  return (
    value.image_url ||
    value.public_url ||
    value.url ||
    value.primary_image_url ||
    ''
  );
}

function formatTimeAgo(value) {
  if (!value) return 'Just now';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return 'Just now';
  const diffMs = Date.now() - dt.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return dt.toLocaleDateString();
}

function OptionPicker({ label, value, options, onSelect }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const selected = String(value) === String(option.id);
          return (
            <Pressable
              key={option.id}
              onPress={() => onSelect(String(option.id))}
              style={[styles.optionChip, selected ? styles.optionChipActive : null]}
            >
              <Text style={[styles.optionChipText, selected ? styles.optionChipTextActive : null]}>
                {option.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function firstParam(value) {
  if (value == null || value === '') return '';
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === 'string' ? v : String(v);
}

function stripBrandFromTitle(nameLike, brandLike) {
  const raw = `${nameLike || ''}`.trim();
  const brand = `${brandLike || ''}`.trim();
  if (!raw) return '';
  if (!brand) return raw;
  const re = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i');
  return raw.replace(re, '').trim() || raw;
}

function editFormFromProduct(nextProduct) {
  if (!nextProduct) {
    return {
      brand: '',
      name: '',
      sku: '',
      packing_per_box: '',
      surface_type_id: '',
      application_type_id: '',
      body_type_id: '',
      quality_id: '',
    };
  }
  return {
    brand: nextProduct.brand || '',
    name: nextProduct.name || '',
    sku: nextProduct.sku || '',
    packing_per_box: String(nextProduct.packing_per_box || ''),
    surface_type_id: nextProduct.surface_type_id ? String(nextProduct.surface_type_id) : '',
    application_type_id: nextProduct.application_type_id ? String(nextProduct.application_type_id) : '',
    body_type_id: nextProduct.body_type_id ? String(nextProduct.body_type_id) : '',
    quality_id: nextProduct.quality_id ? String(nextProduct.quality_id) : '',
  };
}

export default function ProductDetailScreen() {
  const params = useLocalSearchParams();
  const subcategoryId = firstParam(params.subcategoryId);
  const productId = firstParam(params.productId);
  const productNameHint = firstParam(params.productName);
  const [menuOpen, setMenuOpen] = useState(false);
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [quantityInput, setQuantityInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState(editFormFromProduct(null));
  const [surfaceTypes, setSurfaceTypes] = useState([]);
  const [applicationTypes, setApplicationTypes] = useState([]);
  const [bodyTypes, setBodyTypes] = useState([]);
  const [qualities, setQualities] = useState([]);
  const [refsLoading, setRefsLoading] = useState(true);
  const [refsError, setRefsError] = useState('');
  const [images, setImages] = useState([]);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const galleryListRef = useRef(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const loadData = async () => {
    setLoading(true);
    setProduct(null);
    setError('');
    try {
      const [productRes, historyRes, imagesRes] = await Promise.all([
        api.get(`/dealer/products/${productId}`),
        api.get(`/dealer/products/${productId}/transactions`),
        api.get(`/dealer/products/${productId}/images`).catch(() => ({ data: [] })),
      ]);
      const nextProduct = productRes.data?.product || null;
      setProduct(nextProduct);
      setEditForm(editFormFromProduct(nextProduct));
      setHistory(historyRes.data?.transactions || []);
      const raw = imagesRes?.data;
      setImages(Array.isArray(raw) ? raw : []);
      setHeroImageIndex(0);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load product details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadRefs = async () => {
      setRefsError('');
      setRefsLoading(true);
      try {
        const [surfaceRes, appRes, bodyRes, qualityRes] = await Promise.all([
          api.get('/reference/surface-types'),
          api.get('/reference/application-types'),
          api.get('/reference/body-types'),
          api.get('/reference/qualities'),
        ]);
        if (!mounted) return;
        setSurfaceTypes(surfaceRes.data?.surface_types || []);
        setApplicationTypes(appRes.data?.application_types || []);
        setBodyTypes(bodyRes.data?.body_types || []);
        setQualities(qualityRes.data?.qualities || []);
      } catch (err) {
        if (!mounted) return;
        setRefsError(err?.response?.data?.detail || 'Failed to load reference data.');
      } finally {
        if (mounted) {
          setRefsLoading(false);
        }
      }
    };
    loadRefs();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveEdit = async () => {
    if (!product) {
      return;
    }
    if (!editForm.brand.trim() || !editForm.name.trim()) {
      setMessage('Brand and product name are required.');
      return;
    }
    const requiredIds = [
      editForm.surface_type_id,
      editForm.application_type_id,
      editForm.body_type_id,
      editForm.quality_id,
    ];
    if (requiredIds.some((id) => !id)) {
      setMessage('Select surface, application, body type, and quality before saving.');
      return;
    }
    setSavingEdit(true);
    setMessage('');
    try {
      await api.put(`/dealer/products/${productId}`, {
        brand: editForm.brand.trim(),
        name: editForm.name.trim(),
        sku: editForm.sku.trim() || null,
        surface_type_id: editForm.surface_type_id,
        application_type_id: editForm.application_type_id,
        body_type_id: editForm.body_type_id,
        quality_id: editForm.quality_id,
        packing_per_box: Number(editForm.packing_per_box || product.packing_per_box || 1),
      });
      setEditing(false);
      setMessage('Product updated successfully.');
      await loadData();
    } catch (err) {
      setMessage(err?.response?.data?.detail || 'Failed to update product.');
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete product', 'Are you sure you want to delete this product?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/dealer/products/${productId}`);
            const subName = product?.sub_category_name || '';
            router.replace(
              `/inventory/${subcategoryId}/products?subcategoryName=${encodeURIComponent(subName)}`,
            );
          } catch (err) {
            setMessage(err?.response?.data?.detail || 'Failed to delete product.');
          }
        },
      },
    ]);
  };

  useEffect(() => {
    loadData();
  }, [productId]);

  const runTransaction = async (transactionType) => {
    const qty = normalizeQty(quantityInput.trim());
    if (!qty) {
      setMessage('Enter a positive whole number.');
      return;
    }
    setUpdating(true);
    setMessage('');
    try {
      const response = await api.post(`/dealer/products/${productId}/transactions`, {
        transaction_type: transactionType,
        quantity: qty,
      });
      const nextQuantity = response.data?.product?.current_quantity;
      setProduct((prev) => (prev ? { ...prev, current_quantity: nextQuantity } : prev));
      setQuantityInput('');
      setMessage(
        transactionType === 'add'
          ? `Added ${qty} boxes successfully.`
          : `Subtracted ${qty} boxes successfully.`
      );
      const historyRes = await api.get(`/dealer/products/${productId}/transactions`);
      setHistory(historyRes.data?.transactions || []);
    } catch (err) {
      setMessage(err?.response?.data?.detail || 'Transaction failed.');
    } finally {
      setUpdating(false);
    }
  };

  const historyPreview = useMemo(() => history.slice(0, TXN_PREVIEW_LIMIT), [history]);
  const hasMoreTransactions = history.length > TXN_PREVIEW_LIMIT;

  const sortedImages = useMemo(() => sortProductImages(images), [images]);
  const galleryImages = useMemo(() => {
    const fromRows = sortedImages
      .map((img, idx) => ({
        id: img?.id ? String(img.id) : `img-${idx}`,
        uri: resolveImageUrl(img),
      }))
      .filter((img) => !!img.uri);

    if (fromRows.length > 0) return fromRows;

    const fallback = resolveImageUrl(product?.primary_image_url);
    return fallback ? [{ id: 'primary', uri: fallback }] : [];
  }, [sortedImages, product?.primary_image_url]);
  const contentWidth = Math.max(0, windowWidth - 32);
  const safeHeroIndex = galleryImages.length
    ? Math.min(heroImageIndex, galleryImages.length - 1)
    : 0;

  const openGallery = (index) => {
    const i = Math.min(Math.max(0, index), Math.max(0, galleryImages.length - 1));
    setGalleryIndex(i);
    setGalleryOpen(true);
    requestAnimationFrame(() => {
      try {
        galleryListRef.current?.scrollToIndex({ index: i, animated: false });
      } catch {
        // ignore scroll failures on first paint
      }
    });
  };

  const displayProductTitle = stripBrandFromTitle(product?.name || productNameHint, product?.brand);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DealerAppBar onMenuPress={() => setMenuOpen(true)} rightAction="search" />
        <DealerMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
        <View style={styles.bodyFlex}>
          <View style={styles.body}>
            <View style={styles.headerRow}>
              <DealerBackButton />
              {displayProductTitle ? (
                <Text style={[styles.title, styles.titleInRow]} numberOfLines={2}>
                  {displayProductTitle}
                </Text>
              ) : (
                <View style={[styles.titleInRow, styles.titleLoadingSlot]}>
                  <ActivityIndicator size="small" color={BRAND_ORANGE} />
                </View>
              )}
            </View>
          </View>
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={BRAND_ORANGE} />
            <Text style={styles.helperText}>Loading product detail...</Text>
          </View>
        </View>
        <DealerTabBar current="inventory" />
      </SafeAreaView>
    );
  }

  const messageTone = /success/i.test(message)
    ? styles.messageSuccess
    : /failed|required|select|positive|error/i.test(message)
      ? styles.messageError
      : styles.messageNeutral;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DealerAppBar onMenuPress={() => setMenuOpen(true)} rightAction="search" />
      <DealerMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <View style={styles.bodyFlex}>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <DealerBackButton />
          <Text style={[styles.title, styles.titleInRow]} numberOfLines={2}>
            {displayProductTitle || 'Product'}
          </Text>
          {!editing ? (
            <View style={styles.headerActions}>
              <Pressable
                style={styles.iconAction}
                onPress={() => setEditing(true)}
                accessibilityRole="button"
                accessibilityLabel="Edit product"
              >
                <Ionicons name="create-outline" size={18} color={BRAND_ORANGE} />
              </Pressable>
              <Pressable
                style={styles.iconAction}
                onPress={confirmDelete}
                accessibilityRole="button"
                accessibilityLabel="Delete product"
              >
                <Ionicons name="trash-outline" size={18} color="#B91C1C" />
              </Pressable>
            </View>
          ) : null}
        </View>
        <Text style={styles.subtitle}>
          Review stock, update quantity, and edit product attributes.
        </Text>
      </View>

      <ScrollView
        style={styles.scrollFlex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {refsError ? <Text style={styles.errorText}>{refsError}</Text> : null}
        {refsLoading ? <Text style={styles.infoText}>Loading attribute options...</Text> : null}

        {product ? (
          <View style={styles.imageBlock}>
            {galleryImages.length === 0 ? (
              <View style={[styles.imagePlaceholder, { width: contentWidth }]}>
                <Ionicons name="image-outline" size={36} color="#94A3B8" />
                <Text style={styles.imagePlaceholderText}>No photos yet</Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={galleryImages}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id}
                  getItemLayout={(_, index) => ({
                    length: contentWidth,
                    offset: contentWidth * index,
                    index,
                  })}
                  initialScrollIndex={safeHeroIndex}
                  onMomentumScrollEnd={(e) => {
                    const x = e.nativeEvent.contentOffset.x;
                    const idx = Math.round(x / contentWidth);
                    setHeroImageIndex(Math.min(Math.max(0, idx), galleryImages.length - 1));
                  }}
                  renderItem={({ item, index }) => (
                    <Pressable
                      onPress={() => openGallery(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`View product photo ${index + 1} of ${galleryImages.length}`}
                    >
                      <Image
                        source={{ uri: item.uri }}
                        style={[styles.heroImage, { width: contentWidth }]}
                        resizeMode="cover"
                      />
                    </Pressable>
                  )}
                />
                {galleryImages.length > 1 ? (
                  <View style={styles.thumbRow}>
                    {galleryImages.map((img, i) => (
                      <Pressable
                        key={img.id}
                        onPress={() => setHeroImageIndex(i)}
                        style={[styles.thumbWrap, i === safeHeroIndex && styles.thumbWrapActive]}
                        accessibilityRole="button"
                        accessibilityLabel={`Show photo ${i + 1}`}
                      >
                        <Image source={{ uri: img.uri }} style={styles.thumbImage} resizeMode="cover" />
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        {product ? (
          <View style={styles.card}>
            {editing ? (
              <>
                <Text style={styles.sectionTitle}>Edit product</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.brand}
                  onChangeText={(value) => setEditForm((prev) => ({ ...prev, brand: value }))}
                  placeholder="Brand"
                  placeholderTextColor="#94A3B8"
                />
                <TextInput
                  style={styles.input}
                  value={editForm.name}
                  onChangeText={(value) => setEditForm((prev) => ({ ...prev, name: value }))}
                  placeholder="Product name"
                  placeholderTextColor="#94A3B8"
                />
                <TextInput
                  style={styles.input}
                  value={editForm.sku}
                  onChangeText={(value) => setEditForm((prev) => ({ ...prev, sku: value }))}
                  placeholder="SKU"
                  placeholderTextColor="#94A3B8"
                />
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={editForm.packing_per_box}
                  onChangeText={(value) => setEditForm((prev) => ({ ...prev, packing_per_box: value }))}
                  placeholder="Packing per box"
                  placeholderTextColor="#94A3B8"
                />
                <OptionPicker
                  label="Surface Type"
                  value={editForm.surface_type_id}
                  options={surfaceTypes}
                  onSelect={(v) => setEditForm((prev) => ({ ...prev, surface_type_id: v }))}
                />
                <OptionPicker
                  label="Application Type"
                  value={editForm.application_type_id}
                  options={applicationTypes}
                  onSelect={(v) => setEditForm((prev) => ({ ...prev, application_type_id: v }))}
                />
                <OptionPicker
                  label="Body Type"
                  value={editForm.body_type_id}
                  options={bodyTypes}
                  onSelect={(v) => setEditForm((prev) => ({ ...prev, body_type_id: v }))}
                />
                <OptionPicker
                  label="Quality"
                  value={editForm.quality_id}
                  options={qualities}
                  onSelect={(v) => setEditForm((prev) => ({ ...prev, quality_id: v }))}
                />
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.actionButton, styles.primaryButton]}
                    disabled={savingEdit || refsLoading}
                    onPress={handleSaveEdit}
                  >
                    <Text style={styles.buttonText}>{savingEdit ? 'Saving...' : 'Save Edit'}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.neutralButton]}
                    disabled={savingEdit}
                    onPress={() => {
                      setEditing(false);
                      setEditForm(editFormFromProduct(product));
                      setMessage('');
                    }}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.infoText}>Brand: {product.brand || '-'}</Text>
                <Text style={styles.infoText}>Tile size: {product.size_mm || '-'}</Text>
                <Text style={styles.infoText}>Current quantity: {product.current_quantity || 0} boxes</Text>
                <Text style={styles.infoText}>Surface: {product.surface_type || '-'}</Text>
                <Text style={styles.infoText}>Quality: {product.quality || '-'}</Text>
              </>
            )}
          </View>
        ) : null}

        <View style={styles.stockStrip}>
          <Text style={styles.stockStripLabel}>Stock update</Text>
          <View style={styles.stockStripRow}>
            <Text style={styles.stockStripQty}>{product?.current_quantity ?? 0} boxes</Text>
            <TextInput
              style={styles.stockStripInput}
              placeholder="Qty"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={quantityInput}
              onChangeText={setQuantityInput}
              editable={!updating}
            />
            <Pressable
              style={[styles.stockStripBtn, styles.stockStripBtnAdd]}
              onPress={() => runTransaction('add')}
              disabled={updating}
            >
              <Text style={styles.stockStripBtnText}>+</Text>
            </Pressable>
            <Pressable
              style={[styles.stockStripBtn, styles.stockStripBtnSub]}
              onPress={() => runTransaction('subtract')}
              disabled={updating}
            >
              <Text style={styles.stockStripBtnText}>−</Text>
            </Pressable>
          </View>
          <Text style={styles.stockStripHint}>Whole boxes only. Same flow as Products list.</Text>
          {message ? <Text style={[styles.helperText, messageTone]}>{message}</Text> : null}
        </View>

        <View style={styles.txnSection}>
          <View style={styles.txnCardHeader}>
            <Text style={styles.txnSectionTitle}>Recent transactions</Text>
            <Text style={styles.txnSectionSub}>
              {history.length === 0
                ? 'No entries'
                : hasMoreTransactions
                  ? `Showing ${TXN_PREVIEW_LIMIT} of ${history.length} entries`
                  : `${history.length} entr${history.length === 1 ? 'y' : 'ies'}`}
            </Text>
          </View>
          {history.length === 0 ? (
            <Text style={styles.txnEmpty}>No transactions yet.</Text>
          ) : (
            <ScrollView
              style={[styles.txnScroll, { maxHeight: 280 }]}
              contentContainerStyle={styles.txnScrollContent}
              nestedScrollEnabled={Platform.OS === 'android'}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {historyPreview.map((item, idx, arr) => (
                <View
                  key={String(item.id)}
                  style={[styles.txnRow, idx === arr.length - 1 && styles.txnRowLast]}
                >
                  <View
                    style={[
                      styles.txnDot,
                      item.transaction_type === 'add' ? styles.txnDotAdd : styles.txnDotSubtract,
                    ]}
                  />
                  <View style={styles.txnRowBody}>
                    <Text style={styles.txnTitle}>
                      {item.transaction_type === 'add' ? 'Add' : 'Subtract'} {item.quantity} boxes :{' '}
                      {item.quantity_before} → {item.quantity_after}
                    </Text>
                    <Text style={styles.txnMeta}>
                      {formatTimeAgo(item.created_at)}
                      {item.created_by ? ` · ${item.created_by}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
          {hasMoreTransactions ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View all transactions"
              style={styles.txnViewAllFooter}
              onPress={() =>
                router.push(`/inventory/${subcategoryId}/products/${productId}/transactions`)
              }
            >
              <Text style={styles.txnViewAllText}>View all</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
      </View>
      <DealerTabBar current="inventory" />

      <Modal
        visible={galleryOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setGalleryOpen(false)}
      >
        <View style={[styles.galleryOverlay, { width: windowWidth, height: windowHeight }]}>
          <View style={styles.galleryTopBar}>
            <Pressable
              onPress={() => setGalleryOpen(false)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close gallery"
            >
              <Ionicons name="close" size={28} color="#F8FAFC" />
            </Pressable>
          </View>
          {galleryImages.length > 0 ? (
            <>
              <FlatList
                ref={galleryListRef}
                style={styles.galleryList}
                data={galleryImages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                initialScrollIndex={galleryIndex}
                initialNumToRender={galleryImages.length}
                getItemLayout={(_, index) => ({
                  length: windowWidth,
                  offset: windowWidth * index,
                  index,
                })}
                onMomentumScrollEnd={(e) => {
                  const x = e.nativeEvent.contentOffset.x;
                  const idx = Math.round(x / windowWidth);
                  setGalleryIndex(Math.min(Math.max(0, idx), galleryImages.length - 1));
                }}
                renderItem={({ item }) => (
                  <View
                    style={{
                      width: windowWidth,
                      height: windowHeight - 140,
                      justifyContent: 'center',
                      alignItems: 'center',
                      paddingTop: 48,
                    }}
                  >
                    <Image
                      source={{ uri: item.uri }}
                      style={{
                        width: windowWidth - 32,
                        height: windowHeight - 220,
                      }}
                      resizeMode="contain"
                    />
                  </View>
                )}
              />
              <Text style={styles.galleryCounter}>
                {galleryIndex + 1} / {galleryImages.length}
              </Text>
            </>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  bodyFlex: { flex: 1 },
  body: { paddingHorizontal: 16 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  scrollFlex: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginBottom: 6,
  },
  titleInRow: { flex: 1, minWidth: 0 },
  titleLoadingSlot: { minHeight: 28, justifyContent: 'center', alignItems: 'flex-start' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: { fontSize: 22, fontFamily: FONT.bold, color: SLATE, flexShrink: 1 },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
    marginBottom: 12,
  },
  imageBlock: { marginBottom: 12 },
  imagePlaceholder: {
    alignSelf: 'center',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePlaceholderText: { fontSize: 13, color: MUTED, fontFamily: FONT.semibold },
  heroImage: {
    alignSelf: 'center',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  thumbRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    justifyContent: 'center',
  },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbWrapActive: { borderColor: BRAND_ORANGE },
  thumbImage: { width: '100%', height: '100%' },
  galleryOverlay: { backgroundColor: 'rgba(15, 23, 42, 0.94)', flex: 1 },
  galleryList: { flex: 1 },
  galleryTopBar: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 2,
  },
  galleryCounter: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    color: '#F8FAFC',
    fontSize: 14,
    fontFamily: FONT.semibold,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  productName: { fontSize: 17, fontFamily: FONT.bold, color: SLATE, lineHeight: 24 },
  sectionTitle: { fontSize: 16, fontFamily: FONT.bold, color: SLATE, marginBottom: 8 },
  stockStrip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#EEF2F7',
  },
  stockStripLabel: { fontSize: 12, fontFamily: FONT.semibold, color: MUTED, marginBottom: 8 },
  stockStripRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockStripQty: { fontSize: 13, fontFamily: FONT.bold, color: SLATE, minWidth: 72 },
  stockStripInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    color: SLATE,
    fontSize: 15,
    minHeight: 40,
  },
  stockStripBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockStripBtnAdd: { backgroundColor: '#16A34A' },
  stockStripBtnSub: { backgroundColor: '#DC2626' },
  stockStripBtnText: { color: '#FFFFFF', fontSize: 20, fontFamily: FONT.bold, marginTop: -2 },
  stockStripHint: { fontSize: 11, color: MUTED, marginTop: 8, lineHeight: 15 },
  infoText: { color: MUTED, marginTop: 4, lineHeight: 18, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    color: SLATE,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionButton: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  addButton: { backgroundColor: '#16A34A' },
  subtractButton: { backgroundColor: '#DC2626' },
  primaryButton: { backgroundColor: '#2563EB' },
  dangerButton: { backgroundColor: '#B91C1C' },
  neutralButton: { backgroundColor: '#64748B' },
  buttonText: { color: '#FFFFFF', fontFamily: FONT.semibold },
  helperText: { marginTop: 8, lineHeight: 18, fontSize: 13 },
  messageNeutral: { color: MUTED },
  messageSuccess: { color: '#15803D' },
  messageError: { color: '#B91C1C' },
  txnSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 12,
  },
  txnCardHeader: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  txnSectionTitle: { fontSize: 16, fontFamily: FONT.bold, color: SLATE },
  txnSectionSub: { fontSize: 13, color: MUTED, marginTop: 2 },
  txnScroll: {},
  txnScrollContent: { paddingHorizontal: 12, paddingBottom: 8 },
  txnEmpty: {
    color: MUTED,
    paddingVertical: 20,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  txnRowLast: { borderBottomWidth: 0 },
  txnDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  txnDotAdd: { backgroundColor: '#16A34A' },
  txnDotSubtract: { backgroundColor: '#DC2626' },
  txnRowBody: { flex: 1, minWidth: 0 },
  txnTitle: { fontSize: 14, fontFamily: FONT.semibold, color: SLATE, lineHeight: 20 },
  txnMeta: { fontSize: 12, color: MUTED, marginTop: 4 },
  txnViewAllFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  txnViewAllText: { fontSize: 15, fontFamily: FONT.bold, color: BRAND_ORANGE },
  fieldGroup: { gap: 6, marginTop: 10 },
  label: { color: SLATE, fontFamily: FONT.semibold, marginTop: 2 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  optionChipActive: { borderColor: BRAND_ORANGE, backgroundColor: '#FFEDD5' },
  optionChipText: { color: '#334155', fontSize: 12 },
  optionChipTextActive: { color: '#C2410C', fontFamily: FONT.semibold },
  errorText: { marginBottom: 10, color: '#DC2626', paddingHorizontal: 16 },
});
