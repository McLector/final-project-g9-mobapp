import { StyleSheet } from 'react-native';

const EquipmentCardStyle = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageWrapper: {
    position: 'relative',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  availabilityBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  availabilityText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    padding: 14,
    gap: 6,
    borderTopWidth: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  rateLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rate: {
    fontSize: 18,
    fontWeight: '800',
  },
  rateUnit: {
    fontSize: 12,
    fontWeight: '400',
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  condition: {
    fontSize: 11,
  },
  favBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  // Horizontal card
  hCard: {
    width: 164,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  hImageWrap: {
    height: 112,
    position: 'relative',
  },
  hImage: {
    width: '100%',
    height: '100%',
  },
  hGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  availDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  hBody: {
    padding: 12,
  },
  catTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  catTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  hName: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 6,
    letterSpacing: 0,
  },
  hRate: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  hRateUnit: {
    fontSize: 11,
    fontWeight: '400',
  },
  hAvail: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
});

export default EquipmentCardStyle;
