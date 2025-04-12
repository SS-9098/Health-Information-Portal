function LoadingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-gray-300 rounded-lg px-4 py-2 max-w-xs">
        <div className="flex space-x-2">
          <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"></div>
          <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-100"></div>
          <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-200"></div>
        </div>
      </div>
    </div>
  );
}

export default LoadingIndicator;