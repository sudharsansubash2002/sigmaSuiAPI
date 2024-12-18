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
            const tokenURI = req.body.docChecksum ? `https://ipfs.io/ipfs/${req.body.docChecksum}` : `https://ipfs.io/ipfs/cidId`;
            const input = req.body;
            
            // Create a new transaction
            const tx = new Transaction();

            // const inputarray = Object.values(input).map(str => String(str));
            let inputarray = Object.entries(input)
            .filter(([key, value]) => key.startsWith('fVar'))
            .map(([key, value]) => String(value));

            inputarray = [...inputarray, input.uuid, input.tokenKey, input.tenantId];
            
            const inputVectors = inputarray.map(str => {
                // Convert each string to a vector<u8>
                const bytes = bcs.vector(bcs.u8()).serialize([...Buffer.from(str)]).toBytes();
                return bytes;
            });
            
            // Serialize the vector of vectors
            const serializedInput = bcs.vector(bcs.vector(bcs.u8())).serialize(inputVectors).toBytes();
            // const inputVectors = Object.values(input).map(str => bcs.String.serialize(String(str)).toBytes());
            // const inputVectors = input.map(str => bcs.String.serialize(str).toBytes());
    
            // Add the move call to the transaction
            tx.moveCall({
                target: '0xf3a2013a19782964895a3d6ae1b1cd97d0a2445ae66ae5bd7950d3fc0fac515c::sigmanft::mint_to_sender',
                arguments: [
                    tx.pure(bcs.String.serialize("SigmaImmutable").toBytes()), // NFT Name
                    tx.pure(bcs.String.serialize("Sigma a Immutable Life records system").toBytes()), // NFT Description
                    tx.pure(bcs.String.serialize(tokenURI).toBytes()), // NFT Metadata URI
                    tx.pure(serializedInput),
                    tx.object("0xd5ade96bd28d60f5a050ef44e5b9ef2071d5b85d83dd984e2bf6a6d62930b9f4"),
                ],
            });
    
            // Generate the keypair using the private key
            const keypair = secretKeyGenerator(privateKey);

            tx.setGasBudget(20000000);
            // Sign and execute the transaction
            const result = await client.signAndExecuteTransaction({
                signer: keypair,
                transaction: tx,
            });

            let nftObjectId = "issue";
            result.objectChanges?.some(objCh => {
                if (objCh.type === "created" && objCh.objectType.includes("::sigmanft::")) {
                    nftObjectId = objCh.objectId;
                    return true;
                }
            });

            const tx_digest= result.digest;
            // Fetch the transaction details using the transaction digest
            const transactionDetails = await client.getTransactionBlock({ tx_digest });
    
            // Log the result for debugging purposes
            console.log('Minting result:', result);
    
            // Send a success response
            res.status(200).json({
                message: 'NFT minted successfully',             
                ObjectId: nftObjectId,
                transactionHash: result.digest,
                details: transactionDetails,
                input: req.body,
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

    app.get('/fetch-object/:objectId', async (req, res) => {
        try {
            const objectId = req.params.objectId;
    
            // Fetch the object details using the objectId
            const objectDetails = await client.getObject({
                id: objectId,
                options: { showContent: true }
            });
    
            // Send the object details as a response
            res.status(200).json({
                message: 'Object details fetched successfully',
                objectDetails,
            });
        } catch (error) {
            console.error('Error fetching object details:', error);
    
            // Send an error response
            res.status(500).json({
                message: 'Error fetching object details',
                error: error.message,
            });
        }
    });
    
    
    

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;