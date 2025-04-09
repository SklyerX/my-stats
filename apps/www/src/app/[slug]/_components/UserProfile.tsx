import Image from "next/image";
import Link from "next/link";
import { IoContrast } from "react-icons/io5";
import { buttonVariants } from "@workspace/ui/components/button";
import type { InternalTopUserStats } from "@/types/response";
import type { SessionValidationResult } from "@/auth/session";
import { z } from "zod";
import { Fragment } from "react";

const URL_WITHOUT_PROTOCOL_REGEX =
  /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

interface Props {
  user: InternalTopUserStats["user"];
  session?: SessionValidationResult;
  slug: string;
}

export default function UserProfile({ user, session, slug }: Props) {
  const isCurrentUser = user.id === session?.user?.id;
  const showCompareButton = isCurrentUser || session?.user;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-8">
        <Image
          src={user.image}
          alt={`${user.name}`}
          width={120}
          height={120}
          className="rounded-full"
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
