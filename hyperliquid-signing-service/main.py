"""
Hyperliquid Signing Service
Microservice that uses the official Hyperliquid Python SDK to sign actions.

This ensures 100% compatibility with Hyperliquid's signing requirements.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
from typing import Dict, Any

# Add the hyperliquid-python-sdk to the path
# Assuming it's installed via pip or cloned in the parent directory
try:
    from hyperliquid.utils.signing import sign_l1_action
except ImportError:
    print("ERROR: hyperliquid-python-sdk not found!")
    print("Install it with: pip install hyperliquid-python-sdk")
    sys.exit(1)

app = Flask(__name__)
CORS(app)  # Allow CORS for local development

# Configuration from environment variables
# Try to load from .env file if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, use environment variables only

ACCOUNT_ADDRESS = os.getenv('ACCOUNT_ADDRESS', '')
SECRET_KEY = os.getenv('SECRET_KEY', '')

if not ACCOUNT_ADDRESS or not SECRET_KEY:
    print("WARNING: ACCOUNT_ADDRESS or SECRET_KEY not set in environment!")
    print("The service will start but signing will fail until configured.")
    print("Create a .env file with:")
    print("  ACCOUNT_ADDRESS=0x...")
    print("  SECRET_KEY=0x...")


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'hyperliquid-signing-service',
        'account_configured': bool(ACCOUNT_ADDRESS and SECRET_KEY),
    })


@app.route('/sign', methods=['POST'])
def sign():
    """
    Sign an action using the official Hyperliquid Python SDK
    
    Request body:
    {
        "action": {
            "type": "order",
            "orders": [{
                "a": 110000,  // asset index
                "b": true,    // isBuy
                "p": "0",     // price ("0" for market)
                "s": "0.07856", // size
                "r": false,   // reduceOnly
                "t": {
                    "limit": {
                        "tif": "Ioc"
                    }
                }
            }],
            "grouping": "na"
        },
        "nonce": 1763829549803
    }
    
    Response:
    {
        "signature": {
            "r": "0x...",
            "s": "0x...",
            "v": 27 or 28
        },
        "messageHash": "0x..."
    }
    """
    try:
        if not ACCOUNT_ADDRESS or not SECRET_KEY:
            return jsonify({
                'error': 'ACCOUNT_ADDRESS or SECRET_KEY not configured'
            }), 500

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON body provided'}), 400

        action = data.get('action')
        nonce = data.get('nonce')

        if not action or nonce is None:
            return jsonify({'error': 'Missing action or nonce'}), 400

        # Use the official Hyperliquid Python SDK to sign
        # sign_l1_action returns (signature, message_hash)
        signature, message_hash = sign_l1_action(
            action,
            nonce,
            SECRET_KEY
        )

        # Extract r, s, v from signature
        # signature is a tuple (r, s, v) from the SDK
        r, s, v = signature

        return jsonify({
            'signature': {
                'r': r,
                's': s,
                'v': v,
            },
            'messageHash': message_hash,
        })

    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback.print_exc()
        return jsonify({
            'error': error_msg,
            'type': type(e).__name__,
        }), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 3003))
    print(f"Starting Hyperliquid Signing Service on port {port}")
    print(f"Account: {ACCOUNT_ADDRESS[:10]}...{ACCOUNT_ADDRESS[-8:] if ACCOUNT_ADDRESS else 'NOT SET'}")
    app.run(host='0.0.0.0', port=port, debug=True)

