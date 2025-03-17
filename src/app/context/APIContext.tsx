"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import CryptoJS from "crypto-js";

interface ApiKeyContextType {
    apiKey: string | null;
    setApiKey: (key: string | null, encrypt?: boolean, passphrase?: string) => void;
    isApiKeyEncrypted: boolean;
    setIsApiKeyEncrypted: (isEncrypted: boolean) => void;
    passphrase: string | null;
    setPassphrase: (phrase: string | null) => void;
    decryptApiKey: (passphrase: string) => boolean;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const ApiKeyProvider = ({ children }: { children: React.ReactNode }) => {
    const [apiKey, _setApiKey] = useState<string | null>(null);
    const [isApiKeyEncrypted, setIsApiKeyEncrypted] = useState<boolean>(false);
    const [passphrase, setPassphrase] = useState<string | null>(null);

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
        }
    }, []);

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
            decryptApiKey
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