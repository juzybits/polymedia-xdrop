import { useCurrentAccount } from "@mysten/dapp-kit";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

import { useFetch, UseFetchResult } from "@polymedia/suitcase-react";
import { XDrop } from "@polymedia/xdrop-sdk";

import { useAppContext } from "./App";
import { BtnSubmit } from "./comp/buttons";
import { Card, CardMsg, CardXDropDetails, XDropStats } from "./comp/cards";
import { useXDrop } from "./comp/hooks";
import { Loader, XDropLoader } from "./comp/loader";
import { clientWithKeypair } from "./lib/helpers";

export const PageClean = () =>
{
    const { xdropId } = useParams();
    const currAcct = useCurrentAccount();
    const { header, xdropClient } = useAppContext();

    const capFetch = useFetch(
        async () => !currAcct ? undefined : xdropClient.fetchOneCleanerCapId(currAcct.address),
        [xdropClient, currAcct],
    );

    return <>
        {header}
        <div id="page-clean" className="page-regular">
            { !xdropId
                ? <SubPageList />
                : <SubPageClean xdropId={xdropId} capFetch={capFetch} />
            }
        </div>
    </>;
};

const SubPageList = () => {
    const mockXDrops = [
        { id: "0x123", name: "XDrop 1", created_at: new Date().toISOString() },
        { id: "0x456", name: "XDrop 2", created_at: new Date().toISOString() },
    ];

    return <>
        <div className="page-content">
            <div className="page-title">
                Recent xDrops
            </div>

            {mockXDrops.map(xdrop => (
                <Card key={xdrop.id}>
                    <a href={`/clean/${xdrop.id}`} className="clean-list-item">
                        <div className="name">{xdrop.name}</div>
                        <div className="date">{new Date(xdrop.created_at).toLocaleDateString()}</div>
                    </a>
                </Card>
            ))}
        </div>
    </>;
};

const SubPageClean = ({
    xdropId,
    capFetch,
}: {
    xdropId: string;
    capFetch: UseFetchResult<string | null>;
}) =>
{
    const fetchedXDrop = useXDrop(xdropId);
    return (
        <div className="page-content">
            <div className="page-title">
                Clean xDrop
            </div>

            <XDropLoader fetched={fetchedXDrop} requireWallet={true}>
            {(xdrop, _coinMeta) => <>
                <CardXDropDetails
                    xdrop={xdrop}
                    extraDetails={<XDropStats xdrop={xdrop} coinMeta={_coinMeta} />}
                />

                <Loader name="Cleaner Cap" fetcher={capFetch}>
                {cleanerCapId =>
                    <CardClean
                        xdrop={xdrop}
                        cleanerCapId={cleanerCapId}
                        refetch={fetchedXDrop.refetch}
                    />
                }
                </Loader>
            </>}
            </XDropLoader>
        </div>
    );
};

const CardClean = ({
    xdrop, cleanerCapId, refetch,
}: {
    xdrop: XDrop;
    cleanerCapId: string;
    refetch: () => Promise<void>;
}) => {
    const { isWorking, setIsWorking, xdropClient } = useAppContext();

    const disableSubmit = isWorking || !xdrop.is_ended || xdrop.claims.size === 0;

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }
        try {
            setIsWorking(true);

            console.debug("[onSubmit] fetching claim addrs");
            const foreignAddrs = await xdropClient.fetchAllClaimAddrs(xdrop.claims.id, true);

            console.debug("[onSubmit] submitting tx");
            const resp = await xdropClient.cleanerDeletesClaims({
                cleanerCapId,
                xdrop,
                addrs: foreignAddrs,
                onUpdate: msg => console.debug("[cleanerDeletesClaims]", msg),
            });

            console.debug("[onSubmit] okay:", resp);
            toast.success("Success");
            refetch();
        } catch (err) {
            console.warn("[onSubmit] error:", err);
            const msg = xdropClient.errToStr(err, "Failed to clean xDrop");
            msg && toast.error(msg);
        } finally {
            setIsWorking(false);
        }
    };

    if (!xdrop.is_ended) {
        return <CardMsg>XDrop has not ended</CardMsg>;
    }
    if (xdrop.claims.size === 0) {
        return <CardMsg>Already clean</CardMsg>;
    }

    return <Card>
        <BtnSubmit disabled={disableSubmit} onClick={onSubmit}>CLEAN ALL</BtnSubmit>
    </Card>;
};
