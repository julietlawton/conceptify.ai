/* eslint-disable @next/next/no-img-element */
"use client"
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

// Tutorial splash screen component
export default function TutorialSplash({ onClose }: { onClose: () => void }) {
    const [currentStep, setCurrentStep] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    // When the step changes, scroll back up to the top of the card
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [currentStep]);

    // Content for each tutorial step
    const tutorialSteps = [
        {
            title: (
                <div className="flex items-center gap-2">
                    <img src="/appicon.png" alt="App Icon" className="w-8 h-8" />
                    <span>Welcome to Conceptify.AI!</span>
                </div>
            ),
            content: (
                <div className="space-y-4">
                    <p>
                        Conceptify lets you build interactive concept maps from your conversations with AI - supporting meaningful learning by making it easier to visually organize ideas and recall information.
                    </p>
                    <p>This tutorial will guide you through the main features of the app.</p><br></br>
                    <img
                        src="/gifs/intro.gif"
                        alt="Tutorial Intro"
                        className="w-full max-w-xl mx-auto rounded shadow-md"
                    />
                </div>
            ),
        },
        {
            title: "Navigating the App",
            content: (
                <div className="space-y-4">
                    <p>
                        <strong>Side Bar Toggle:</strong> Use the side bar toggle button to open and close the chat.
                    </p>
                    <p>
                        <strong>Concept Map Toggle:</strong> Use the concept map toggle button to open and close the concept map.
                    </p>
                    <p>
                        <strong>Settings Menu:</strong> The settings menu is located at the bottom of the side bar.
                    </p>
                    <img
                        src="/gifs/appnav.gif"
                        alt="Navigating the App"
                        className="w-full max-w-xl mx-auto rounded shadow-md"
                    />
                </div>
            ),
        },
        {
            title: "Creating a Concept Map",
            content: (
                <div className="space-y-4">
                    <p>
                        Every chat has its own concept map. To start a new chat, click the + button in the side bar. There are two ways to create a concept map for a chat:
                    </p>
                    <ul className="list-disc pl-6">
                        <li>
                            <strong>Add a Message to the Concept Map:</strong> After sending a message, click &quot;Add to Concept Map&quot; to extract concepts from that message.
                            If the chat doesn&apos;t have a concept map yet, one will be created automatically; otherwise, the new concepts will be added to the existing map.
                        </li><br></br>
                        <img
                            src="/gifs/creatingconceptmap1.gif"
                            alt="Creating a Concept Map"
                            className="w-full max-w-xl mx-auto rounded shadow-md"
                        /><br></br>
                        <li>
                            <strong>Create an Empty Concept Map:</strong> To create an empty concept map, click the &quot;Create Empty Concept Map&quot; button.
                            Use this option if you want to begin building a concept map from scratch.
                        </li><br></br>
                        <img
                            src="/gifs/creatingconceptmap2.gif"
                            alt="Creating a Concept Map"
                            className="w-full max-w-xl mx-auto rounded shadow-md"
                        /><br></br>
                    </ul>
                </div>
            ),
        },
        {
            title: "Navigating the Concept Map",
            content: (
                <div className="space-y-4">
                    <p>
                        <strong>Zoom:</strong> Pinch (touchpad) or use the mouse wheel (mouse) to zoom in and out.
                    </p>
                    <p>
                        <strong>Pan:</strong> Click and drag on the background to move around the concept map.
                    </p>
                    <p>
                        <strong>View Node Info:</strong> Hover over a node to see its detailed information card. Stop hovering to dismiss the card.
                    </p>
                    <p>
                        <strong>Drag Nodes:</strong> Click and drag on any node to reposition it. Drag and hold to freeze a node, release to reset.
                    </p>
                    <img
                        src="/gifs/graphnav.gif"
                        alt="Concept Map Navigation"
                        className="w-full max-w-xl mx-auto rounded shadow-md"
                    />
                    <p>
                        <strong>Search:</strong> To search for a node, click the search icon in the toolbar and enter its name in the search bar. Selecting a node in the search results will jump to its position.
                    </p>
                    <img
                        src="/gifs/search.gif"
                        alt="Node Search"
                        className="w-full max-w-xl mx-auto rounded shadow-md"
                    />
                    <p>
                        <strong>Fullscreen and Reset View:</strong> Click the fullscreen button in the toolbar to put the concept map in fullscreen. Click the reset view button to fit the concept map to the concept map window.
                    </p>
                    <img
                        src="/gifs/fullscreen.gif"
                        alt="Fullscreen"
                        className="w-full max-w-xl mx-auto rounded shadow-md"
                    /><br></br>
                </div>
            ),
        },
        {
            title: "Customizing the Concept Map",
            content: (
                <div className="space-y-4">
                    <p>
                        <strong>Adding and Editing Nodes:</strong> Click the + button in the toolbar to add a new node to the concept map or click the pencil button to edit an existing node.
                        To delete a node, click the trashcan button. A node must be selected (by clicking on it) before you can edit or delete it. Up to three actions (add, edit, delete node) can be undone/redone.
                    </p>
                    <img
                        src="/gifs/addedit.gif"
                        alt="Add Edit Delete"
                        className="w-full max-w-xl mx-auto rounded shadow-md"
                    />
                    <p>
                        <strong>Color Palette Selection:</strong> Use the color palette picker to change the color palette for the concept map.
                    </p>
                    <img
                        src="/gifs/colorselection.gif"
                        alt="Color Selection"
                        className="w-full max-w-xl mx-auto rounded shadow-md"
                    /><br></br>
                </div>
            ),
        },
        {
            title: "Summarize and Recall",
            content: (
                <div className="space-y-4">
                    <p>
                        <strong>Generating a Quiz:</strong> Test your recall of information in the concept map by clicking the lightbulb button to create a quiz. You can choose the number of questions in the quiz, its difficulty level, and what concepts you want excluded from the questions.
                    </p>
                    <img
                        src="/gifs/quiz.gif"
                        alt="Quiz Generation"
                        className="w-full max-w-xl mx-auto rounded shadow-md"
                    />
                    <p>
                        <strong>Generating a Summary:</strong> To collate all of the node information into a single summary, click the note button in the toolbar. The summary can be exported as a text file or a PDF.
                    </p>
                    <img
                        src="/gifs/summary.gif"
                        alt="Summary Generation"
                        className="w-full max-w-xl mx-auto rounded shadow-md"
                    />
                    <br></br>
                </div>
            ),
        },
        {
            title: "Settings and Your Data",
            content: (
                <div className="space-y-4">
                    <p>Configure your model provider settings and manage your data in the Settings menu. After the demo period, this app will require an API key for chat and concept map generation.</p>
                    <p>
                        All app data, including your API key, is stored <strong>locally in your browser</strong> and never sent elsewhere. You can optionally set a password to encrypt your key for privacy. 
                        This is recommended if you share your device or use browser extensions. While encryption helps prevent casual access, some extensions can still read data on websites you visit. 
                        <strong> Only enter your API key if you trust your browser extensions.</strong>
                    </p>
                    <p>
                        Since your data is stored locally, it is recommended to save your data regularly by exporting it to avoid losing it when your browser updates or clears.
                    </p>
                    <img
                        src="/settings.png"
                        alt="Settings Screenshot"
                        className="w-full max-w-md mx-auto rounded shadow-md"
                    />
                </div>
            ),
        },
        {
            title: "That's it!",
            content: (
                <div className="space-y-4 text-center">

                    <div className="flex flex-col items-center justify-center text-green-600">
                        <CheckCircleIcon className="w-16 h-16" />
                    </div>
                    <p>You&apos;re ready to start using the app.</p>
                    <p>You can revisit this tutorial anytime from the Settings menu.</p>
                    <p>If you have any feedback, use the feedback button to send me a message — I&apos;d love to hear from you!</p>
                </div>
            ),
        },
    ];

    // Move tutorial to the next card
    const nextStep = () => {
        if (currentStep < tutorialSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onClose();
        }
    };

    // Move tutorial to the previous card
    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90%] flex flex-col">
                {/* Title for each tutorial card */}
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl">{tutorialSteps[currentStep].title}</CardTitle>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <XMarkIcon className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </div>
                </CardHeader>

                {/* Tutorial content for each card */}
                <div className="relative flex-1 overflow-hidden">
                    <CardContent
                        ref={scrollContainerRef}
                        className="overflow-y-auto px-6 space-y-4 h-full pr-2 mr-3"
                        style={{ maxHeight: "calc(90vh - 150px)" }}>
                        {tutorialSteps[currentStep].content}
                    </CardContent>
                    {/* Top and bottom gradient to fade content to white (avoids harsh lines between content and header/footer) */}
                    <div className="pointer-events-none absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-white to-transparent mr-6" />
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-white to-transparent" />
                </div>

                {/* Tutorial navigation buttons */}
                <CardFooter className="flex justify-between mt-auto px-6 pb-4">
                    <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
                        <ChevronLeftIcon className="mr-2 h-4 w-4" /> Previous
                    </Button>
                    <div className="flex items-center space-x-1 pr-5">
                        {tutorialSteps.map((_, index) => (
                            <div
                                key={index}
                                className={`h-2 w-2 rounded-full ${index === currentStep ? "bg-primary" : "bg-gray-300"}`}
                            />
                        ))}
                    </div>
                    <Button onClick={nextStep}>
                        {currentStep === tutorialSteps.length - 1 ? "Finish" : "Next"}
                        <ChevronRightIcon className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

