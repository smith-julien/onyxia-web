import React, { useState } from "react";
import * as reactDom from "react-dom";
import { getValidatedEnv } from "./validatedEnv";

import type { OidcClientConfig, SecretsManagerClientConfig, OnyxiaApiClientConfig } from "lib/setup";
import { id } from "evt/tools/typeSafety/id";
import { I18nProvider } from "./i18n/I18nProvider";
import { RouteProvider } from "./router";
import { StoreProvider } from "app/lib/StoreProvider";
import type { Props as StoreProviderProps } from "app/lib/StoreProvider";
import { themeProviderFactory } from "app/theme/ThemeProvider";
import { useIsDarkModeEnabled } from "app/tools/hooks/useIsDarkModeEnabled";
import { SplashScreen } from "app/components/shared/SplashScreen";
import { App } from "app/components/App";
import { css } from "tss-react";
import { useLng } from "app/i18n/useLng";
import { useDomRect } from "powerhooks";
import {
    KcApp,
    defaultKcProps,
    kcContext as realKcContext,
    kcContextMocks
} from "keycloakify";



const { ThemeProvider } = themeProviderFactory(
    { "isReactStrictModeEnabled": process.env.NODE_ENV !== "production" }
);

function Root() {

    const { isDarkModeEnabled } = useIsDarkModeEnabled();
    const { lng } = useLng();

    return (
        <React.StrictMode>
            <I18nProvider lng={lng}>
                <RouteProvider>
                    <ThemeProvider isDarkModeEnabled={isDarkModeEnabled}>
                        <InnerRootWithThemeAvailable />
                    </ThemeProvider>
                </RouteProvider>
            </I18nProvider>
        </React.StrictMode>
    );

};

/** We need to be inside the theme provider to be able to use useDOMRect */
function InnerRootWithThemeAvailable() {


    const { isDarkModeEnabled } = useIsDarkModeEnabled();

    const [createStoreParams] = useState(() => {

        const env = getValidatedEnv();

        return id<StoreProviderProps["createStoreParams"]>({
            "isColorSchemeDarkEnabledByDefault": isDarkModeEnabled,
            "oidcClientConfig":
                env.AUTHENTICATION.TYPE === "oidc" ?
                    id<OidcClientConfig.Keycloak>({
                        "implementation": "KEYCLOAK",
                        "keycloakConfig": env.AUTHENTICATION.OIDC
                    }) :
                    id<OidcClientConfig.Phony>({
                        "implementation": "PHONY",
                        "tokenValidityDurationMs": Infinity,
                        "parsedJwt": {
                            "email": "john.doe@insee.fr",
                            "preferred_username": "doej"
                        }
                    }),
            "secretsManagerClientConfig": id<SecretsManagerClientConfig.Vault>({
                "implementation": "VAULT",
                "baseUri": env.VAULT.BASE_URI,
                "engine": env.VAULT.ENGINE,
                "role": env.VAULT.ROLE
            }),
            "onyxiaApiClientConfig": id<OnyxiaApiClientConfig.Official>({
                "implementation": "OFFICIAL",
                "baseUrl": env.API.BASE_URL ?? (() => {

                    const { protocol, host } = window.location;

                    return `${protocol}//${host}/api`;

                })()
            })
        });

    });

    const { ref, domRect: { width, height } } = useDomRect();

    return (
        <div ref={ref} className={css({ "height": "100%" })}>
            <SplashScreen className={css({ width, "position": "absolute", height, "zIndex": 10 })} />
            <StoreProvider createStoreParams={createStoreParams} >
                <App />
            </StoreProvider>
        </div>
    );

}

const kcContext = realKcContext ?? (
    false /* Set to true to test the login pages outside of Keycloak */
        ? kcContextMocks.kcLoginContext /* Change to .kcRegisterContext for example */
        :
        undefined
);

if (kcContext !== undefined) {
    console.log(JSON.stringify(kcContext, null, 2));
}

reactDom.render(
    kcContext !== undefined ?
        <KcApp
            kcContext={kcContext}
            {...{
                ...defaultKcProps,
                "kcHeaderWrapperClass": css({ "color": "red" })
            }}
        /> :
        <Root />,
    document.getElementById("root")
);
