"use client";

import React from "react";
import { Tooltip, IconButton, Text } from "@radix-ui/themes";

export function HelpPopup() {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <Tooltip
        content={
          <div style={{ maxWidth: 360 }}>
            <Text as="div" size="4" weight="bold" mb="2">
              How to use the Irons Grotto Rank Calculator
            </Text>
            <Text as="div" size="3">
              To use this calculator, simply:<br />
              - Download the TempleOSRS plugin.<br />
              - Sync with Temple via the button in your collection log.<br />
              - Also use the WikiSync plugin. This allows it to be seamless and filled out automatically.<br />
              - If you are a mobile-only player, you will need to fill out the data yourself.<br />
              <br />
              To submit this, click the drop down and apply for promotion.
            </Text>
          </div>
        }
        side="bottom"
        align="center"
        delayDuration={0}
      >
        <IconButton
          aria-label="Show help info"
          variant="surface"
          size="3"
          style={{
            borderRadius: "50%",
            fontWeight: "bold",
            fontSize: 28,
            marginLeft: 8,
          }}
        >
          ?
        </IconButton>
      </Tooltip>
    </div>
  );
}