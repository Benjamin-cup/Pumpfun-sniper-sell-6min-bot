import { Keypair, Transaction, Connection, ComputeBudgetProgram, sendAndConfirmTransaction, PublicKey } from "@solana/web3.js"
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { AnchorProvider } from "@coral-xyz/anchor";

// import base58 from "bs58"
import { RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT } from "../../sdksrc/constants"

import { PumpFunSDK } from "../../sdksrc/src/pumpfun";
import { runBot } from "../..";


const commitment = "confirmed"
const connection = new Connection(RPC_ENDPOINT, {
    wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment
})


let sdk = new PumpFunSDK(new AnchorProvider(connection, new NodeWallet(new Keypair()), { commitment }));

async function sellToken(mintAddress: PublicKey, mainKp: Keypair, connection: Connection) {


    console.log(await connection.getBalance(mainKp.publicKey) / 10 ** 9, "SOL in main keypair")

    console.log(mintAddress);


    try {
        console.log("======================== Token Sell start =========================")

        const tokenAccount = await getAssociatedTokenAddress(mintAddress, mainKp.publicKey);

        const tokenBalance = (await connection.getTokenAccountBalance(tokenAccount)).value.amount


        if (tokenBalance) {
            // console.log("tokenBalance", Math.floor(tokenBalance * 10 ** 5));


            const tokenSellix = await makeSellIx(mainKp, Number(tokenBalance), mintAddress)
            console.log(tokenSellix);
            if (!tokenSellix) {
                console.log("Token buy instruction not retrieved")
                return
            }

            const tx = new Transaction().add(
                ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: 300_000,
                }),
                ComputeBudgetProgram.setComputeUnitLimit({
                    units: 600_000,
                }),
                tokenSellix

            )

            tx.feePayer = mainKp.publicKey
            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

            console.log(await connection.simulateTransaction(tx))

            const signature = await sendAndConfirmTransaction(connection, tx, [mainKp], { skipPreflight: true, commitment: commitment });

            console.log(`Sell Tokens : https://solscan.io/tx/${signature}`)

            runBot();

        }

        console.log("======================== Token Sell end ==========================")

    } catch (error) {
        console.log("======================== Token Sell fail =========================")
    }



}
// make sell instructions
const makeSellIx = async (kp: Keypair, sellAmount: number, mintAddress: PublicKey) => {
    let sellIx = await sdk.getSellInstructionsByTokenAmount(
        kp.publicKey,
        mintAddress,
        BigInt(sellAmount),
        BigInt(100),
        commitment
    );

    console.log("Sellamount:", sellAmount);

    return sellIx
}

export default sellToken;