import QRCode from 'qrcode';
export { buildQrPayload, QR_TYPE_LABELS } from './qrPayload.js';

const MAX_QR_TEXT = 2500;

export async function makeQrBuffer(payload) {
  if (Buffer.byteLength(payload, 'utf8') > MAX_QR_TEXT) throw new Error('المحتوى طويل جداً للباركود. اختصره قليلاً ثم حاول مرة ثانية.');
  return QRCode.toBuffer(payload, { type: 'png', errorCorrectionLevel: 'H', margin: 3, width: 900, color: { dark: '#111111', light: '#FFFFFF' } });
}
