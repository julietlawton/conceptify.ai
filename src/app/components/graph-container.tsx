import NetworkGraph from "./network-graph";

export default function GraphContainer({ conversationId, graphId }: { conversationId: string; graphId?: string }) {
    // if (graphId) {
    //     return <NetworkGraph conversationId={conversationId} />;
    // }
    
    return (
        <div 
            className="flex items-center justify-center h-full w-full bg-gray-100 bg-center bg-no-repeat bg-contain"
            style={{ 
                backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.95)), url('/graph-placeholder.svg')`
            }}
        >
            <p className="text-gray-500 text-lg  bg-opacity-70 p-4 rounded-lg">
                Nothing here yet. Add a message to get started.
            </p>
        </div>
    );
}