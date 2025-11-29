export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6">
        <img 
          src="https://www.worldimpactmedia.org/images/wimb.png" 
          alt="WIMB Logo" 
          className="w-20 h-20 animate-pulse"
        />
        <div className="w-16 h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-full animate-linkedin-loading"></div>
      </div>
    </div>
  );
}
