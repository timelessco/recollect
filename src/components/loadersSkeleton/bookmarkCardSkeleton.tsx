const BookmarkCardSkeleton = () => {
  return (
    <div className="border shadow rounded-md max-w-sm w-full mx-auto">
      <div className="animate-pulse space-x-4">
        <div className="h-48 w-full bg-slate-200"></div>
        <div className="flex-1 space-y-6 p-6 ">
          <div className="h-2 bg-slate-200 rounded"></div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="h-2 bg-slate-200 rounded col-span-2"></div>
              <div className="h-2 bg-slate-200 rounded col-span-1"></div>
            </div>
            <div className="h-2 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookmarkCardSkeleton;
