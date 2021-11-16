import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";
import nookies, { parseCookies, setCookie, destroyCookie } from "nookies";
import parseLinkHeader from "parse-link-header";

export const getServerSideProps = async (ctx) => {
  try {
    const tokenCookies = nookies.get(ctx);
    const { accessToken } = tokenCookies;
    const initialPage = 1;
    const perPage = 2;
    let hasNextPage = null;
    if (accessToken) {
      // accessToken present in cookie

      // fetching user details
      const userPromise = axios.get(`https://api.dribbble.com/v2/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // fetching dribbble shots
      const shotsPromise = axios.get(
        `https://api.dribbble.com/v2/user/shots?page=${initialPage}&per_page=${perPage}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const [shotsResponse, userResponse] = await Promise.all([
        shotsPromise,
        userPromise,
      ]);

      const parsedLinks = parseLinkHeader(shotsResponse.headers.link);
      if (parsedLinks.next) {
        hasNextPage = true;
      } else {
        hasNextPage = false;
      }

      return {
        props: {
          isAuthorized: true,
          userProfileURL: userResponse.data.html_url,
          shots: shotsResponse.data,
          error: null,
          initialPage: initialPage,
          perPage: perPage,
          hasNextPage,
        },
      };
    } else {
      // accessToken not found in cookie

      return {
        props: {
          isAuthorized: false,
          userProfileURL: "",
          shots: [],
          error: null,
          initialPage: initialPage,
          perPage: perPage,
          hasNextPage: hasNextPage,
        },
      };
    }
  } catch (error) {
    return {
      props: {
        isAuthorized: true,
        userProfileURL: "",
        shots: [],
        error: error.message,
        initialPage: null,
        perPage: null,
        hasNextPage: null,
      },
    };
  }
};

export default function Home(props) {
  const router = useRouter();
  const [userProfileURL, setUserProfileURL] = useState(props.userProfileURL);
  const [dribbbleShots, setDribbbleShots] = useState(props.shots);
  const [isFetchingShots, setIsFetchingShots] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(props.isAuthorized);
  // const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(props.initialPage || 1);
  const [perPage, setPerPage] = useState(props.perPage || 1);
  const [hasNextPage, setHasNextPage] = useState(props.hasNextPage);
  const authorize = (e) => {
    e.preventDefault();
    router.push(
      `https://dribbble.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_CLIENT_ID}`
    );
  };

  const loadMoreShots = async () => {
    setPage(parseInt(page) + 1);
    const { accessToken } = parseCookies();
    let nextPage = page + 1;
    setIsFetchingShots(true);
    const newShots = await axios.get(
      `https://api.dribbble.com/v2/user/shots?page=${nextPage}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const parsedLinks = parseLinkHeader(newShots.headers.link);
    if (!parsedLinks.next) {
      setHasNextPage(false);
    }
    setIsFetchingShots(false);
    if (newShots.data.length) {
      setDribbbleShots([...dribbbleShots, ...newShots.data]);
    }
  };

  const removeAccount = () => {
    destroyCookie(null, "accessToken");
    setIsAuthorized(false);
    router.replace(router.pathname);
  };

  useEffect(() => {
    const { code } = router.query;
    async function getAccessToken() {
      try {
        // fetching accessToken
        // setIsLoading(true);
        const response = await axios.post(
          `https://dribbble.com/oauth/token?client_id=${process.env.NEXT_PUBLIC_CLIENT_ID}&client_secret=${process.env.NEXT_PUBLIC_CLIENT_SECRET}&code=${code}`
        );
        const { access_token: accessToken } = response.data;

        // setting accessToken in cookie
        setCookie(null, "accessToken", accessToken, {
          maxAge: 24 * 60 * 60,
          path: "/",
        });

        // updating state
        // setIsLoading(false);
        setIsAuthorized(true);

        // fetching shots
        setIsFetchingShots(true);
        axios
          .get(
            `https://api.dribbble.com/v2/user/shots?page=${page}&per_page=${perPage}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          )
          .then((shots) => {
            // updating state
            setDribbbleShots(shots.data);
            setIsFetchingShots(false);
            const parsedLinks = parseLinkHeader(shots.headers.link);
            if (!parsedLinks.next) {
              setHasNextPage(false);
            } else {
              setHasNextPage(true);
            }
          });

        axios
          .get(`https://api.dribbble.com/v2/user`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          })
          .then((userProfile) => {
            setUserProfileURL(userProfile.data.html_url);
          });
      } catch (error) {
        // setIsLoading(false);
        setIsFetchingShots(false);
        console.warn(error);
      }
    }
    if (isAuthorized) {
      if (code) {
        // if authorised user directly goes to url with code in query parameter
        // then removing the code from query parameter
        router.replace(router.pathname);
      }
    } else {
      // if user not authorized and code coming in dribbble callbackurl
      if (code) {
        getAccessToken();
      }
    }
  }, [router]);

  const renderIntegrateButton = () => {
    return (
      <main className="min-h-screen flex flex-col justify-center content-center">
        <div className="m-auto">
          <button
            onClick={authorize}
            className="py-2 px-4 border font-medium leading-1 text-center tracking-wider transition-all ease-in duration-75 outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed lg:flex items-center rounded leading-120 select-none mx-0 text-sm text-white bg-primary"
          >
            Integrate Dribbble
          </button>
        </div>
      </main>
    );
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between py-5">
        <div className="flex items-center">
          <Image
            src="/dribbble-logo.svg"
            alt="dribbble logo"
            width={120}
            height={27}
            className="lg:mr-4 mr-2 h-5 lg:h-auto"
          />
          <button
            className="underline text-xs px-6 text-secondary"
            onClick={removeAccount}
          >
            Remove account
          </button>
        </div>
        <span className="bg-gray-100 text-secondary py-0.5 px-2 text-xs hover:bg-gray-200 hover:text-primary">
          <a href={userProfileURL} target="_blank" rel="noreferrer">
            {userProfileURL}
          </a>
        </span>
      </div>
    );
  };

  const renderShots = () => {
    return dribbbleShots.map((shot, i) => (
      <a
        href={shot.html_url}
        target="_blank"
        rel="noreferrer"
        key={i}
        className="flex"
      >
        <div className="border border-primary hover:border-secondary bg-white hover:bg-gray-100 w-full opacity-100 rounded-lg overflow-hidden">
          <div
            className="lg:h-80 h-60 bg-cover bg-center bg-no-repeat bg-gray-200"
            style={{
              backgroundImage: `url(${shot.images.hidpi})`,
            }}
          ></div>
          <p className="text-primary text-base font-semibold m-4">
            {shot.title}
          </p>
        </div>
      </a>
    ));
  };

  const renderShowMoreButton = () => {
    return (
      <button
        className="mx-auto py-2 px-4 border font-medium leading-1 text-center tracking-wider transition-all ease-in duration-75 outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed lg:flex items-center rounded leading-120 select-none text-sm bg-white text-primary border-secondary hover:bg-green-50"
        onClick={loadMoreShots}
      >
        <span className="flex items-center">Show more </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="ml-1"
        >
          <path d="M17,9.17a1,1,0,0,0-1.41,0L12,12.71,8.46,9.17a1,1,0,0,0-1.41,0,1,1,0,0,0,0,1.42l4.24,4.24a1,1,0,0,0,1.42,0L17,10.59A1,1,0,0,0,17,9.17Z"></path>
        </svg>
      </button>
    );
  };

  const renderShotsSkeleton = () => {
    return [1, 2].map((shot, i) => (
      <div key={i} className="flex">
        <div className="border border-primary bg-white w-full opacity-100 rounded-lg overflow-hidden">
          <div className="lg:h-80 h-60 bg-cover bg-center bg-no-repeat bg-gray-200"></div>
          <div className="text-primary text-base font-semibold h-4 m-4"></div>
        </div>
      </div>
    ));
  };

  const renderShotsView = () => {
    return (
      <main className="max-w-screen-lg mx-auto mt-4">
        {renderHeader()}
        <div className="grid lg:grid-cols-2 gap-4 mt-6 mb-8">
          {dribbbleShots.length > 0 && renderShots()}
          {isFetchingShots && renderShotsSkeleton()}
        </div>
        {hasNextPage && renderShowMoreButton()}
      </main>
    );
  };

  return (
    <div>
      <Head>
        <title>MyDesignCreations</title>
        <meta name="description" content="Your Dribbble Creations" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {!isAuthorized ? renderIntegrateButton() : renderShotsView()}
    </div>
  );
}
