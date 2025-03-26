"use client";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import CryptoJS from "crypto-js";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

interface ApiKeyContextType {
    apiKey: string | null;
    setApiKey: (key: string | null, encrypt?: boolean, passphrase?: string) => void;
    isApiKeyEncrypted: boolean;
    setIsApiKeyEncrypted: (isEncrypted: boolean) => void;
    passphrase: string | null;
    setPassphrase: (phrase: string | null) => void;
    decryptApiKey: (passphrase: string) => boolean;
    isDemoActive: boolean;
    demoUsesRemaining: number;
    setDemoUsesRemaining: (usesRemaining: number) => void;
    userFingerprint: string | null;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

// Context provider for api keys and demo state
export const ApiKeyProvider = ({ children }: { children: React.ReactNode }) => {
    // API key state
    const [apiKey, _setApiKey] = useState<string | null>(null);
    const [isApiKeyEncrypted, setIsApiKeyEncrypted] = useState<boolean>(false);
    const [isApiKeyInitialized, setIsApiKeyInitialized] = useState(false);
    const [passphrase, setPassphrase] = useState<string | null>(null);

    // Demo state
    const [isDemoActive, setIsDemoActive] = useState<boolean>(false);
    const [demoUsesRemaining, setDemoUsesRemaining] = useState<number>(0);
    const [userFingerprint, setUserFingerprint] = useState<string | null>(null);
    const hasCheckedFingerprint = useRef(false);

    // On page load, check storage for a saved api key and encryption settings
    // If encryption is off, set the api key right away
    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedKey = localStorage.getItem("apiKey");
            const encryptedFlag = localStorage.getItem("isApiKeyEncrypted") === "true";

            if (storedKey) {
                if (encryptedFlag) {
                    setIsApiKeyEncrypted(true);
                } else {
                    _setApiKey(storedKey);
                    setIsApiKeyEncrypted(false);
                }
            }
            setIsApiKeyInitialized(true);
        }
    }, []);

    // Once the demo uses remaining count gets to 0, disable the demo
    // NOTE: This is for the UI only, demo usage is enforced server-side
    useEffect(() => {
        if (demoUsesRemaining === 0) {
            setIsDemoActive(false);
        }
    }, [demoUsesRemaining]);

    // If no api key is set, fingerprint the browser to determine demo availability 
    // Once the fingerprint has been checked for this session, avoid checking it again
    useEffect(() => {
        if (!isApiKeyInitialized || hasCheckedFingerprint.current) return;

        async function checkDemoUsage() {
            try {
                // Get browser fingerprint
                const fp = await FingerprintJS.load();
                const result = await fp.get();
                const fingerprint = result.visitorId;
                setUserFingerprint(fingerprint);
                
                // Check fingerprint against the db
                const res = await fetch("/api/fingerprint/check", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fingerprintId: fingerprint }),
                });

                // Get usage count for this fingerprint
                const data = await res.json();
                const usageCount = data.usage;

                const maxDemoUses = 5;
                const remaining = Math.max(0, maxDemoUses - usageCount);

                // If this user has not set an api key and still has demo uses remaining,
                // enable the demo and set their remaining demo uses
                if (remaining > 0 && !apiKey && !isApiKeyEncrypted) {
                    setIsDemoActive(true);
                    setDemoUsesRemaining(remaining);
                } else {
                    setIsDemoActive(false);
                    setDemoUsesRemaining(0);
                }
                hasCheckedFingerprint.current = true;
            } catch (err) {
                // If the check fails, disallow the demo
                console.error("Demo usage check failed:", err);
                setIsDemoActive(false);
            }
        }

        checkDemoUsage();
    }, [isApiKeyInitialized, isApiKeyEncrypted, apiKey]);

    // Handle decryption for users that have enabled api key encryption
    const decryptApiKey = (passphrase: string): boolean => {
        // Get encrypted api key from storage
        const encrypted = localStorage.getItem("apiKey");
        try {
            // Try to decrypt the api key with the passphrase entered by the user
            const bytes = CryptoJS.AES.decrypt(encrypted || "", passphrase);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);

            // If the decrypted string starts with APIKEY: it is valid, otherwise
            // the passphrase was incorrect and decryption has failed
            if (decrypted.startsWith("APIKEY:")) {
                const actualKey = decrypted.slice(7);
                // If decryption was successful, set the api key
                _setApiKey(actualKey);
                return true;
            } else {
                console.error("Decryption failed.");
                return false;
            }
        } catch (err) {
            console.error("Error decrypting key:", err);
            return false;
        }
    };

    // Public setter for the api key, used in the settings menu
    const setApiKey = (key: string | null, encrypt = false, passphrase?: string) => {
        // If setter was called with null key, clear api key settings in storage
        if (key === null) {
            _setApiKey(null);
            localStorage.removeItem("apiKey");
            localStorage.setItem("isApiKeyEncrypted", "false");
            setIsApiKeyEncrypted(false);
            return;
        }

        // Once the user has provided an api key, turn the demo off
        setIsDemoActive(false);

        // If encryption was enabled use AES to encrypt the key and save it, 
        // otherwise save the key in plaintext
        if (encrypt && passphrase) {
            if (!key) {
                console.error("Attempted to encrypt a null or empty key!");
                return;
            }
            // Prefix the key with special value to validate decryption
            const toEncrypt = `APIKEY:${key}`;
            const encrypted = CryptoJS.AES.encrypt(toEncrypt, passphrase).toString();
            localStorage.setItem("apiKey", encrypted);
            localStorage.setItem("isApiKeyEncrypted", "true");
            setIsApiKeyEncrypted(true);
        } else {
            localStorage.setItem("apiKey", key);
            localStorage.setItem("isApiKeyEncrypted", "false");
            setIsApiKeyEncrypted(false);
        }

        // Call private setter
        _setApiKey(key);
    };

    return (
        <ApiKeyContext.Provider value={{
            apiKey,
            setApiKey,
            isApiKeyEncrypted,
            setIsApiKeyEncrypted,
            passphrase,
            setPassphrase,
            decryptApiKey,
            isDemoActive,
            demoUsesRemaining,
            setDemoUsesRemaining,
            userFingerprint
        }}>
            {children}
        </ApiKeyContext.Provider>
    );
};

// Export api key context
export const useApiKey = () => {
    const context = useContext(ApiKeyContext);
    if (!context) throw new Error("useApiKey must be used within ApiKeyProvider");
    return context;
};