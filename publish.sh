#!/bin/bash

# exit on any command errors within the script
set -e
# treat attempted usage of variables as errors
set -u

usage ()
{
    echo "usage: publish.sh <args>"
    echo " -a: access token file"
    echo " -c: client secret file"
    echo " -s: source directory of chrome plugin"
    echo " -p: publish (requires upload)"
    echo " -v: verbose output"
    echo "default: dry run, validates client secret/access token files"
}

UPLOAD=0
PUBLISH=0
CHECK_STATUS=0
VERBOSITY=-s
CHROME_PLUGIN_ID=bhigicedeaekhgjpgmpigofebngokpip
ACCESS_TOKEN_FILE=
CLIENT_SECRET_FILE=
SRC_DIR=

while getopts ":a:c:d:hspuv" opt; do
    case $opt in
        a)
            ACCESS_TOKEN_FILE=$OPTARG
            ;;
        c)
            CLIENT_SECRET_FILE=$OPTARG
            ;;
        d)
            SRC_DIR=$OPTARG
            ;;
        h)
            usage
            exit 1
            ;;
        p)
            PUBLISH=1
            ;;
        s)
            CHECK_STATUS=1
            ;;
        u)
            UPLOAD=1
            ;;
        v)
            VERBOSITY=-v
            ;;
        \?)
            echo "Invalid option: -$OPTARG" >&2
            exit 1
            ;;
        :)
            echo "Option -$OPTARG requires an argument." >&2
            exit 1
            ;;
    esac
done

# pull our credentials out of the secrets repo
if [[ ! -f $ACCESS_TOKEN_FILE ]]
then
    echo "couldn't find access token file $ACCESS_TOKEN_FILE."
    echo "please specify a valid file with -a"
    exit 1
fi

if [[ ! -f $CLIENT_SECRET_FILE ]]
then
    echo "couldn't find client secret file $CLIENT_SECRET_FILE."
    echo "please specify a valid file with -c"
    exit 1
fi

echo "using access token file $ACCESS_TOKEN_FILE and client secret file $CLIENT_SECRET_FILE"

CLIENT_SECRET=`cat $CLIENT_SECRET_FILE | jq -r '.installed.client_secret'`
CLIENT_ID=`cat $CLIENT_SECRET_FILE | jq -r '.installed.client_id'`
REFRESH_TOKEN=`cat $ACCESS_TOKEN_FILE | jq -r '.refresh_token'`

ACCESS_TOKEN=`curl $VERBOSITY -X POST -d "client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&refresh_token=$REFRESH_TOKEN&grant_type=refresh_token" https://www.googleapis.com/oauth2/v4/token | jq -r '.access_token'`

if [[ $UPLOAD -eq 1 ]]
then
    # zip up our plugin files
    if [[ ! -d $SRC_DIR ]]
    then
        echo "couldn't find source directory $SRC_DIR."
        echo "please specify a valid directory with -d"
        exit 1
    fi

    echo "building a chrome plugin from $SRC_DIR"
    TEMP_FILE=`mktemp $TMPDIR/houston-crx.zip.XXXXX`
    rm $TEMP_FILE
    zip $TEMP_FILE $SRC_DIR/*

    # upload our zipped bundle
    echo "uploading $TEMP_FILE"
    RESP=`curl $VERBOSITY \
        -H "Authorization: Bearer $ACCESS_TOKEN"  \
        -H "x-goog-api-version: 2" \
        -X PUT \
        -T $TEMP_FILE \
        https://www.googleapis.com/upload/chromewebstore/v1.1/items/$CHROME_PLUGIN_ID`
    # error checking is a pain. On failure, a .itemError array will exist in the response.
    # on success, it's null. jq returns zero for length(null)
    ERR_LEN=`echo $RESP | jq '.itemError | length'`
    if [[ $ERR_LEN -eq 0 ]]
    then
       echo "upload successful"
    else
        RESP_ERROR=`echo $RESP | jq '.itemError'`
        echo "upload failed: $RESP_ERROR"
        exit 1
    fi
else
    echo "skipping upload (you can set this with -u)"
fi

if [[ $PUBLISH -eq 1 ]]
then
    # publish latest version
    echo "publishing new version"
    RESP=`curl $VERBOSITY \
        -H "Authorization: Bearer $ACCESS_TOKEN"  \
        -H "x-goog-api-version: 2" \
        -H "Content-Length: 0" \
        -X POST \
        https://www.googleapis.com/chromewebstore/v1.1/items/$CHROME_PLUGIN_ID/publish`
    # error checking is a pain. Status should be [ "OK " ]
    # note that this is different than the upload API
    STATUS_LENGTH=`echo $RESP | jq -r '.status | length'`
    FIRST_STATUS=`echo $RESP | jq -r '.status[0]'`
    if [[ $STATUS_LENGTH -eq 1 && $FIRST_STATUS = "OK" ]]
    then
        echo "publish successful"
    else
        echo "publish failed: $RESP"
        exit 1
    fi
else
    echo "skipping publish (you can set this with -p)"
fi

if [[ $CHECK_STATUS -eq 1 ]]
then
   echo "checking publish status"
   curl \
       -H "Authorization: Bearer $ACCESS_TOKEN"  \
       -H "x-goog-api-version: 2" \
       -H "Content-Length: 0" \
       -H "Expect:" \
       -X GET \
       $VERBOSITY \
       https://www.googleapis.com/chromewebstore/v1.1/items/$CHROME_PLUGIN_ID?projection=draft
fi

