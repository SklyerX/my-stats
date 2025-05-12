import Image from "next/image";
import Link from "next/link";
import { IoContrast } from "react-icons/io5";
import { buttonVariants } from "@workspace/ui/components/button";
import type { InternalTopUserStats } from "@/types/response";
import type { SessionValidationResult } from "@/auth/session";
import { Fragment } from "react";
import type { Integrations } from "@workspace/database/schema";
import { FaDiscord, FaGithub, FaSpotify, FaTwitch } from "react-icons/fa";
import type { IconType } from "react-icons/lib";

import type { JSX } from "react";

const URL_WITHOUT_PROTOCOL_REGEX =
  /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

const icons = [
  {
    id: "spotify",
    icon: FaSpotify,
  },
  {
    id: "discord",
    icon: FaDiscord,
  },
  {
    id: "github",
    icon: FaGithub,
  },
  {
    id: "twitch",
    icon: FaTwitch,
  },
];

interface Props {
  user: InternalTopUserStats["user"];
  session?: SessionValidationResult;
  slug: string;
  integrations: Integrations[];
}

export default function UserProfile({
  user,
  session,
  slug,
  integrations,
}: Props): JSX.Element {
  const isCurrentUser = user.id === session?.user?.id;
  const showCompareButton = isCurrentUser || session?.user;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-8">
        <img
          src={user.image}
          alt={`${user.name}`}
          className="rounded-full w-28 h-28"
        />

        <div className="mt-4 w-full">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-extrabold">{user.name}</h2>

            {showCompareButton && (
              <Link
                href={`/${slug}/compare`}
                className={buttonVariants({
                  size: "sm",
                  variant: "outline",
                  class: "hidden sm:inline-flex",
                })}
              >
                <IoContrast className="size-4" /> Compare
              </Link>
            )}
          </div>

          <p className="text-muted-foreground mt-1">
            {user.bio
              ? user.bio.split(" ").map((word, i) => {
                  const isLink = URL_WITHOUT_PROTOCOL_REGEX.test(word);
                  return (
                    <Fragment key={`${word}_${i}`}>
                      {i > 0 && " "}
                      {isLink ? (
                        <Link
                          href={
                            word.startsWith("http") ? word : `https://${word}`
                          }
                          target="_blank"
                          className="text-primary font-medium"
                        >
                          {word}
                        </Link>
                      ) : (
                        word
                      )}
                    </Fragment>
                  );
                })
              : null}
          </p>
          <div className="flex items-center gap-3 mt-2">
            {integrations.map((integration) => {
              const icon = icons.find(
                (x) => x.id === integration.platformName.toLowerCase(),
              ) as { id: string; icon: IconType };

              return (
                <Link
                  href={integration.profileUrl as string}
                  className="hover:opacity-70 transition-opacity"
                  target="_blank"
                  key={integration.id}
                >
                  <icon.icon className="size-6" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {showCompareButton && (
        <Link
          href={`/${slug}/compare`}
          className={buttonVariants({
            size: "sm",
            variant: "outline",
            class: "sm:hidden inline-flex",
          })}
        >
          <IoContrast className="size-4" /> Compare
        </Link>
      )}
    </div>
  );
}
