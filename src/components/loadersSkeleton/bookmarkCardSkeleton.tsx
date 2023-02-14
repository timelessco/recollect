const BookmarkCardSkeleton = () => {
  return (
    <div className="mx-auto w-full max-w-sm rounded-md border shadow">
      <div className="animate-pulse space-x-4">
        <div className="h-48 w-full bg-slate-200" />
        <div className="flex-1 space-y-6 p-6 ">
          <div className="h-2 rounded bg-slate-200" />
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 h-2 rounded bg-slate-200" />
              <div className="col-span-1 h-2 rounded bg-slate-200" />
            </div>
            <div className="h-2 rounded bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookmarkCardSkeleton;
