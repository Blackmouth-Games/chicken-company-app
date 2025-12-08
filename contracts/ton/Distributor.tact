// Distributor rewards contract for TON
// Non-custodial, Merkle-based distribution.
// One Merkle root per epoch.
// Leaves: sha256( wallet:amount_nano )

import "@stdlib/strings";
import "@stdlib/hash";

contract Distributor {

    // -----------------------------
    // STORAGE
    // -----------------------------
    address static owner;             // Multisig
    int currentEpoch;                 // Last published epoch
    cell merkleRoot;                  // Current epoch Merkle root
    map<int, cell> roots;             // Optional: store roots per epoch
    map<(int, slice), bool> claimed;  // (epoch, user_wallet) → claimed?

    // -----------------------------
    // INTERNAL HELPERS
    // -----------------------------
    inline fun checkOwner() {
        require(msg.sender == owner, "NOT_OWNER");
    }

    // computes sha256( left || right )
    inline fun sha256_pair(a: slice, b: slice): slice {
        // join a+b
        var builder = beginCell();
        builder = builder.storeSlice(a);
        builder = builder.storeSlice(b);
        return sha256(builder.endCell().beginParse());
    }

    // compare hex slices (ton strings are slices)
    inline fun lexSort(a: slice, b: slice): (slice, slice) {
        if (a.compare(b) < 0) {
            return (a, b);
        } else {
            return (b, a);
        }
    }

    // -----------------------------
    // UPDATE ROOT (only owner)
    // -----------------------------
    receive("updateRoot") {
        checkOwner();

        var cs = msg.body().beginParse();

        int epoch = cs.loadInt(32);
        cell newRoot = cs.loadCell();

        currentEpoch = epoch;
        merkleRoot = newRoot;
        roots.set(epoch, newRoot);
    }

    // -----------------------------
    // CLAIM
    // -----------------------------
    receive("claim") {
        var cs = msg.body().beginParse();

        // params from user
        int epoch = cs.loadInt(32);
        int amountNano = cs.loadCoins();    // nanoTON
        int proofLen = cs.loadInt(16);

        // Their wallet must be msg.sender (pure pull model)
        // Convert it to text slice for hashing
        // We store wallet as raw slice for leaf.
        slice walletSlice = msg.sender.asSlice();

        // Build leaf = sha256(wallet_string + ":" + amount_nano)
        // The frontend sends wallet in string form, but on-chain
        // we convert msg.sender → base64 address string.
        //
        // So we need to reconstruct the EXACT same string that off-chain used.
        //
        // Off-chain: walletAddress = base64 URL (std TON address)
        // On-chain:  we do address→string the same way.
        //
        // Tact stdlib provides address.toString() for standard string.
        string wStr = msg.sender.toString();   // EXACT same as off-chain
        string amtStr = amountNano.toString();
        string leafStr = wStr + ":" + amtStr;

        // hash string → sha256 hex slice
        builder leafBuilder = beginCell();
        leafBuilder = leafBuilder.storeString(leafStr);
        slice leafHash = sha256(leafBuilder.endCell().beginParse());

        // Read Merkle proof
        slice[] proof = new slice[](proofLen);
        repeat (proofLen) i {
            proof[i] = cs.loadRef().beginParse();
        }

        // Verify not claimed yet
        val claimedKey = (epoch, walletSlice);
        require(!claimed.has(claimedKey), "ALREADY_CLAIMED");

        // Verify epoch matches
        cell rootCell = roots.get(epoch);
        require(rootCell != null, "NO_ROOT_FOR_EPOCH");
        slice root = rootCell.beginParse();

        // Recompute hash up the tree
        var computed = leafHash;

        for (_, sib) in proof {
            // lexicographic ordering
            var (left, right) = lexSort(computed, sib);
            computed = sha256_pair(left, right);
        }

        // Must match root
        require(computed == root, "INVALID_PROOF");

        // Mark as claimed
        claimed.set(claimedKey, true);

        // Payout TON to user
        send(msg.sender, amountNano);
    }

    // fallback reject everything else
    receive { 
        // ignore
    }
}




