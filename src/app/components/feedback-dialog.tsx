import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { Loader } from "lucide-react";

// Send feedback dialog component
export default function FeedbackDialog({
    isSendFeedbackOpen,
    setIsSendFeedbackOpen
}: {
    isSendFeedbackOpen: boolean;
    setIsSendFeedbackOpen: (open: boolean) => void;
}) {
    // Feedback message state
    const [feedbackMessage, setfeedbackMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"success" | "error" | null>(null);

    // Handle feedback message submission
    const handleSubmitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackMessage.trim()) return;

        // Set loading status to show spinner
        setLoading(true);

        // Attempt to send the message
        try {
            const response = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ feedbackMessage }),
            });

            // Handle response success
            if (response.ok) {
                setStatus("success");
                setTimeout(() => {
                    setStatus(null);
                    setIsSendFeedbackOpen(false);
                }, 2000);
                setfeedbackMessage("");
            } else {
                setStatus("error");
            }
        } catch (error) {
            console.error("Error sending feedback:", error);
            setStatus("error");
        }

        // Finish loading
        setLoading(false);
    };

    return (
        <Dialog open={isSendFeedbackOpen} onOpenChange={setIsSendFeedbackOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Leave Feedback</DialogTitle>
                    <DialogDescription>Have thoughts or suggestions? Send me anonymous feedback.</DialogDescription>
                </DialogHeader>
                {/* While loading, show spinner */}
                {loading ? (
                    <div className="flex justify-center pb-8">
                        <Loader className="animate-spin w-12 h-12 text-gray-600" />
                    </div>
                    // If message was sent successfuly, show success message
                ) : status === "success" ? (
                    <div className="flex flex-col items-center justify-center pb-8 text-green-600">
                        <CheckCircleIcon className="w-16 h-16" />
                        <p className="text-lg">Thank you for your Feedback!</p>
                    </div>
                    // If message did not go through, show error message
                ) : status === "error" ? (
                    <div className="flex flex-col items-center justify-center pb-8 text-red-600">
                        <XCircleIcon className="w-16 h-16" />
                        <p className="text-lg">Something went wrong. Please try again.</p>
                    </div>
                ) : (
                    // Feedback text area
                    <Textarea
                        id="info"
                        value={feedbackMessage}
                        onChange={(e) => setfeedbackMessage(e.target.value)}
                        className="h-32"
                        placeholder="Your message here..."
                    />
                )}

                {/* Submission/retry button */}
                <DialogFooter className="flex justify-end space-x-2">
                    {status === "error" ? (
                        <Button onClick={handleSubmitFeedback}>Retry</Button>
                    ) : (
                        !loading && !status && (
                            <Button onClick={handleSubmitFeedback} disabled={!feedbackMessage.trim()}>
                                Send
                            </Button>
                        )
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}