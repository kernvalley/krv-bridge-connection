import { importJWK } from '@shgysk8zer0/jwk-utils/jwk';
import { readFile } from 'node:fs/promises';
import { INTERNAL_SERVER_ERROR } from '@shgysk8zer0/consts/status.js';

async function getPublicKey() {
	const keyData = JSON.parse(await readFile('_data/jwk.json', { encoding: 'utf-8' }));
	return await importJWK(keyData);
}

function sendError(message, status = INTERNAL_SERVER_ERROR, details = null) {
	return Response.json({
		error: { message, status, details }
	}, { status });
}

export default async () => {
	const publicKey = await getPublicKey();

	if (publicKey instanceof CryptoKey) {
		const data = await crypto.subtle.exportKey('jwk', publicKey);
		return Response.json(data);
	} else if (publicKey instanceof Error) {
		return sendError('Could not access public JWK.', INTERNAL_SERVER_ERROR);
	} else {
		return sendError('Could not access public JWK.', INTERNAL_SERVER_ERROR);
	}
};
