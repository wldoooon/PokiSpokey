const Ellipses = () => {
	const sharedClasses =
		"rounded-full outline outline-8 sm:my-6 md:my-8 size-1 my-4 outline-background bg-foreground";
	return (
		<div className="absolute z-0 grid h-full w-full items-center gap-8 lg:grid-cols-2">
			<div className="absolute z-0 grid h-full w-full grid-cols-2 place-content-between">
				<div className={`${sharedClasses} -mx-[2.5px]`}></div>
				<div className={`${sharedClasses} -mx-[2px] place-self-end`}></div>
				<div className={`${sharedClasses} -mx-[2.5px]`}></div>
				<div className={`${sharedClasses} -mx-[2px] place-self-end`}></div>
			</div>
		</div>
	);
};

const Container = ({ children }: { children: React.ReactNode }) => (
	<div className="relative w-full rounded-2xl border px-4 sm:px-6 md:px-10 h-full flex flex-col">
		<div className="absolute left-0 top-4 z-0 h-px w-full bg-border sm:top-6 md:top-8"></div>
		<div className="absolute bottom-4 left-0 z-0 h-px w-full bg-border sm:bottom-6 md:bottom-8"></div>
		<div className="relative w-full border-x flex-1 flex flex-col">
			<Ellipses />
			{/* Reduced internal padding to push Carousel closer to the inner frame lines */}
			<div className="relative z-20 flex-1 w-full h-full flex flex-col py-4 sm:py-10 px-1 sm:px-1.5 md:px-2">{children}</div>
		</div>
	</div>
);
//======================================
export const CarouselCard = ({ children }: { children: React.ReactNode }) => {
	return (
		<Container>
			<div className="flex-1 w-full relative rounded-xl overflow-hidden shadow-sm shadow-foreground/5 border border-border/70 dark:border-border/40 min-h-[400px]">
				<div className="absolute inset-0">
					{children}
				</div>
			</div>
		</Container>
	);
};