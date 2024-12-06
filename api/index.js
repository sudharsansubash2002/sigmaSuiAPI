const express = require('express');
const {Ed25519Keypair} = require('@mysten/sui/keypairs/ed25519');
const {Transaction} = require('@mysten/sui/transactions');
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { bcs } = require('@mysten/sui/bcs');

require('dotenv').config();

const app = express();

// Middleware to parse JSON requests
app.use(express.json());
 
const PORT = 42101;
// Example of accessing private key and RPC URL
const privateKey = process.env.PRIVATE_KEY;

// Create a SuiClient instance
const client = new SuiClient({ url: getFullnodeUrl('testnet') });


// Basic Routes
app.get('/', (req, res) => {
    res.send('Welcome to the Sigma Sui API!');
});;

const secretKeyGenerator = (private_key) => {
    const keypair = Ed25519Keypair.fromSecretKey(private_key);
    return keypair;
    }

    app.post('/mintnft', async (req, res) => {
        try {
            // Extract tokenURI from the request or use a default value
            // const tokenURI = req.query.tokenURI ?? "https://example.com/metadata.json";
            const tokenURI = req.body.tokenURI ?? "https://example.com/metadata.json";
            
            // Create a new transaction
            const tx = new Transaction();
    
            // Add the move call to the transaction
            tx.moveCall({
                target: '0xb0a4b4b75c0697960bb462d57ef13aeca9439517d0ad5731d17666f0e219aa0b::sigmanft::mint_to_sender',
                arguments: [
                    tx.pure(bcs.String.serialize("SigmaNFT").toBytes()), // NFT Name
                    tx.pure(bcs.String.serialize("Sigma a Immutable Life records system").toBytes()), // NFT Description
                    tx.pure(bcs.String.serialize(tokenURI).toBytes()), // NFT Metadata URI
                ],
            });
    
            // Generate the keypair using the private key
            const keypair = secretKeyGenerator(privateKey);
    
            // Sign and execute the transaction
            const result = await client.signAndExecuteTransaction({
                signer: keypair,
                transaction: tx,
            });
    
            // Log the result for debugging purposes
            console.log('Minting result:', result);
    
            // Send a success response
            res.status(200).json({
                message: 'NFT minted successfully',
                transactionHash: result.digest,
                details: result,
            });
        } catch (error) {
            // Log the error for debugging purposes
            console.error('Error minting NFT:', error);
    
            // Send an error response
            res.status(500).json({
                message: 'Error minting NFT',
                error: error.message,
            });
        }
    });
    

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;