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

export const ApiKeyProvider = ({ children }: { children: React.ReactNode }) => {
    const [apiKey, _setApiKey] = useState<string | null>(null);
    const [isApiKeyEncrypted, setIsApiKeyEncrypted] = useState<boolean>(false);
    const [passphrase, setPassphrase] = useState<string | null>(null);
    const [isDemoActive, setIsDemoActive] = useState<boolean>(false);
    const [demoUsesRemaining, setDemoUsesRemaining] = useState<number>(0);
    const [userFingerprint, setUserFingerprint] = useState<string | null>(null);
    const hasCheckedFingerprint = useRef(false);
    const [isApiKeyInitialized, setIsApiKeyInitialized] = useState(false);

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

    useEffect(() => {
        if (demoUsesRemaining === 0) {
            setIsDemoActive(false);
        }
    }, [demoUsesRemaining]);

    useEffect(() => {
        if (!isApiKeyInitialized || hasCheckedFingerprint.current) return;

        async function checkDemoUsage() {
            try {
                const fp = await FingerprintJS.load();
                const result = await fp.get();
                const fingerprint = result.visitorId;
                setUserFingerprint(fingerprint);

                const res = await fetch("/api/fingerprint/check", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fingerprintId: fingerprint }),
                });

                const data = await res.json();
                const usageCount = data.usage;

                const maxDemoUses = 5;
                const remaining = Math.max(0, maxDemoUses - usageCount);

                if (remaining > 0 && !apiKey && !isApiKeyEncrypted) {
                    setIsDemoActive(true);
                    setDemoUsesRemaining(remaining);
                } else {
                    setIsDemoActive(false);
                    setDemoUsesRemaining(0);
                }
                hasCheckedFingerprint.current = true;
            } catch (err) {
                console.error("Demo usage check failed:", err);
                setIsDemoActive(false);
            }
        }

        checkDemoUsage();
    }, [isApiKeyInitialized, isApiKeyEncrypted, apiKey]);

    const decryptApiKey = (passphrase: string): boolean => {
        const encrypted = localStorage.getItem("apiKey");
        try {
            const bytes = CryptoJS.AES.decrypt(encrypted || "", passphrase);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);

            if (decrypted.startsWith("APIKEY:")) {
                const actualKey = decrypted.slice(7);
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

    const setApiKey = (key: string | null, encrypt = false, passphrase?: string) => {
        if (key === null) {
            _setApiKey(null);
            localStorage.removeItem("apiKey");
            localStorage.setItem("isApiKeyEncrypted", "false");
            setIsApiKeyEncrypted(false);
            return;
        }

        setIsDemoActive(false);

        if (encrypt && passphrase) {
            if (!key) {
                console.error("Attempted to encrypt a null or empty key!");
                return;
            }
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

export const useApiKey = () => {
    const context = useContext(ApiKeyContext);
    if (!context) throw new Error("useApiKey must be used within ApiKeyProvider");
    return context;
};