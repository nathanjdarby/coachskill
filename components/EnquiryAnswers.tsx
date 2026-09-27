import { Fragment } from "react";
import { enquiryRows } from "@/lib/discovery";

type Props = { enquiry: Parameters<typeof enquiryRows>[0] };

/** An enquiry's answers as <dt>/<dd> pairs (interests as tags). Goes inside a <dl>. */
export function EnquiryAnswers({ enquiry }: Props) {
  return (
    <>
      {enquiryRows(enquiry).map((row) => (
        <Fragment key={row.label}>
          <dt>{row.label}</dt>
          <dd>
            {row.list ? (
              <span className="pt-tags">
                {row.list.map((item) => (
                  <span key={item} className="pt-tag">
                    {item}
                  </span>
                ))}
              </span>
            ) : (
              row.value
            )}
          </dd>
        </Fragment>
      ))}
    </>
  );
}
