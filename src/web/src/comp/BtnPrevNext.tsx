import { useFetchAndPaginate } from "@polymedia/suitcase-react";
import { RefObject } from "react";
import { Btn } from "./button";

export const BtnPrevNext: React.FC<{
    data: ReturnType<typeof useFetchAndPaginate>;
    onPageChange?: () => void;
    scrollToRefOnPageChange?: RefObject<HTMLElement>;
}> = ({
    data,
    onPageChange,
    scrollToRefOnPageChange,
}) => {
    if (!data.hasMultiplePages) {
        return null;
    }

    const handlePageChange = () => {
        if (scrollToRefOnPageChange?.current) {
            const navBarHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-bar-height"));
            const extraOffset = 9;
            const totalOffset = navBarHeight + extraOffset;
            const yOffset = scrollToRefOnPageChange.current.getBoundingClientRect().top + window.scrollY - totalOffset;
            window.scrollTo({ top: yOffset });
        }

        onPageChange?.();
    };

    const handlePrevClick = () => {
        data.goToPreviousPage();
        handlePageChange();
    };

    const handleNextClick = () => {
        data.goToNextPage();
        handlePageChange();
    };

    return (
        <div className="btn-prev-next">
            <Btn
                disabled={data.isLoading || data.isFirstPage}
                onClick={handlePrevClick}
            >
                PREV
            </Btn>
            <Btn
                disabled={data.isLoading || (data.isLastPage && !data.hasNextPage)}
                working={data.isLoading}
                onClick={handleNextClick}
            >
                NEXT
            </Btn>
        </div>
    );
};
