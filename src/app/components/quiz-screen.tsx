"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";
import { useApiKey } from "@/app/context/APIContext";
import { checkQuizAnswer } from "@/app/lib/model";

// Quiz screen component
export default function QuizScreen({
    isQuizOpen,
    setIsQuizOpen,
    quizData
}: {
    isQuizOpen: boolean;
    setIsQuizOpen: (open: boolean) => void;
    quizData: {
        questions: {
            question: string;
            hint: string;
            exampleAnswer: string;
        }[]
    };
}) {

    // API key + demo context
    const { apiKey, isDemoActive, userFingerprint, demoUsesRemaining, setDemoUsesRemaining } = useApiKey();

    // Quiz state
    const [quizProgress, setQuizProgress] = useState(() =>
        quizData.questions.map(() => ({
            userAnswer: "",
            hintVisible: false,
            validationStatus: "unvalidated", // unvalidated | validating | correct | partiallyCorrect | incorrect
            explanation: ""
        }))
    );

    // Check the user answer against the question
    const handleCheckAnswer = async (idx: number, question: string, userAnswer: string) => {

        if (!apiKey && !isDemoActive) {
            toast.error("No API key found. Please add your API key in Settings.")
            return;
        }

        try {
            // Set question status to validating
            const newProgress = [...quizProgress];
            newProgress[idx].validationStatus = "validating";
            setQuizProgress(newProgress);

            // Form request body with question + answer
            const requestBody =
            {
                question: question,
                userAnswer: userAnswer
            };

            // Await validation
            const result = await checkQuizAnswer(requestBody, isDemoActive, apiKey, userFingerprint);

            if (!result) {
                newProgress[idx].validationStatus = "unvalidated";
                setQuizProgress([...newProgress]);
                return;
            }

            // Set the validation status and explanation based off the model's evaluation
            newProgress[idx].validationStatus = result.evaluation;
            newProgress[idx].explanation = result.explanation;
            setQuizProgress([...newProgress]);

            // If demo is active, decrement demo uses remaining
            // NOTE: This is for the UI only, demo usage is enforced server side
            if (isDemoActive) {
                setDemoUsesRemaining(Math.max(0, demoUsesRemaining - 1));
            }

        } catch (error) {
            toast.error("Answer validation failed. Please try again.");
            console.error("Error validating quiz answer", error);
        }

    };

    return (
        <Dialog open={isQuizOpen} onOpenChange={setIsQuizOpen}>
            <DialogContent className="w-full max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Quiz</DialogTitle>
                    <DialogDescription>Test your understanding by answering the questions below.</DialogDescription>
                </DialogHeader>

                {quizData && (
                    <div className="space-y-6">
                        {quizData.questions.map((q, idx) => (
                            <div key={idx} className="bg-gray-50 border rounded-lg shadow-sm p-6 space-y-4">
                                {/* Question */}
                                <p className="text-lg font-semibold">{idx + 1}. {q.question}</p>

                                {/* Hint */}
                                {quizProgress[idx].hintVisible && (
                                    <p className="text-sm text-gray-500 border-l-2 border-gray-300 pl-3 italic">
                                        <strong>Hint:</strong> {q.hint}
                                    </p>
                                )}

                                {/* Answer text input */}
                                <Textarea
                                    placeholder="Type your answer here..."
                                    value={quizProgress[idx].userAnswer}
                                    onChange={(e) => {
                                        const newProgress = [...quizProgress];
                                        newProgress[idx].userAnswer = e.target.value;
                                        setQuizProgress(newProgress);
                                    }}
                                    className="mt-2 h-24 p-3"
                                />

                                {/* Validation result */}
                                {quizProgress[idx].validationStatus !== "unvalidated" && (
                                    <div className="mt-4 space-y-2">
                                        {/* Correct answer */}
                                        {quizProgress[idx].validationStatus === "correct" && (
                                            <>
                                                <p className="text-green-600 text-sm font-semibold">✓ Correct</p>
                                                <p className="text-sm text-gray-600"><strong>Explanation:</strong> {quizProgress[idx].explanation}</p>
                                            </>
                                        )}
                                        {/* Partially correct */}
                                        {quizProgress[idx].validationStatus === "partiallyCorrect" && (
                                            <>
                                                <p className="text-yellow-500 text-sm font-semibold">⁓ Partially Correct</p>
                                                <p className="text-sm text-gray-600"><strong>Explanation:</strong> {quizProgress[idx].explanation}</p>
                                                <p className="text-sm text-gray-600"><strong>Example Answer:</strong> {q.exampleAnswer}</p>
                                            </>
                                        )}
                                        {/* Incorrect answer */}
                                        {quizProgress[idx].validationStatus === "incorrect" && (
                                            <>
                                                <p className="text-red-600 text-sm font-semibold">✗ Incorrect</p>
                                                <p className="text-sm text-gray-600"><strong>Explanation:</strong> {quizProgress[idx].explanation}</p>
                                                <p className="text-sm text-gray-600"><strong>Example Answer:</strong> {q.exampleAnswer}</p>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Question buttons */}
                                <div className="flex justify-end gap-2 mt-4">
                                    {/* Hint button */}
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            const newProgress = [...quizProgress];
                                            newProgress[idx].hintVisible = !newProgress[idx].hintVisible;
                                            setQuizProgress(newProgress);
                                        }}
                                    >
                                        {quizProgress[idx].hintVisible ? "Hide Hint" : "Show Hint"}
                                    </Button>
                                    
                                    {/* Check answer button */}
                                    {quizProgress[idx].validationStatus === "validating" ? (
                                        <Button disabled className="px-8">
                                            <Loader className="animate-spin w-4 h-4" />
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => {
                                                handleCheckAnswer(
                                                    idx,
                                                    q.question,
                                                    quizProgress[idx].userAnswer
                                                );
                                            }}
                                        >
                                            Check Answer
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}