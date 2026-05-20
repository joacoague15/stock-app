import { existsSync, readFileSync } from 'fs';
import * as admin from 'firebase-admin';
import { env } from './env';

let app: admin.app.App | undefined;

function loadServiceAccount(): admin.ServiceAccount | undefined {
    // Producción: el JSON entero viene en una env var (una sola línea).
    const json = env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (json && json.trim().length > 0) {
        try {
            return JSON.parse(json) as admin.ServiceAccount;
        } catch (err) {
            console.error('[fcm] FIREBASE_SERVICE_ACCOUNT_JSON no es JSON válido', err);
            return undefined;
        }
    }

    // Local: leer del archivo en disco (comportamiento original).
    const path = env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (path && existsSync(path)) {
        try {
            return JSON.parse(readFileSync(path, 'utf-8')) as admin.ServiceAccount;
        } catch (err) {
            console.error('[fcm] no se pudo leer el service account del archivo', err);
            return undefined;
        }
    }

    return undefined;
}

export function initFirebase(): void {
    const sa = loadServiceAccount();
    if (!sa) {
        console.warn('[fcm] disabled (no service account)');
        return;
    }
    try {
        app = admin.initializeApp({ credential: admin.credential.cert(sa) });
        console.log('[fcm] initialized');
    } catch (err) {
        console.error('[fcm] init failed', err);
    }
}

export async function sendPush(token: string, title: string, body: string): Promise<void> {
    if (!app) return;
    try {
        await admin.messaging(app).send({
            token,
            notification: { title, body },
            android: { priority: 'high', notification: { sound: 'default' } },
        });
    } catch (err) {
        console.error('[fcm] send failed', err);
    }
}