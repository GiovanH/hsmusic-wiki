import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateAlbumCoverArtwork',
    'generateAlbumNavAccent',
    'generateAlbumSidebarTrackSection',
    'generateAlbumStyleRules',
    'generateColorStyleVariables',
    'generateContentHeading',
    'generateTrackCoverArtwork',
    'generatePageLayout',
    'linkAlbum',
    'linkTrack',
    'transformContent',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, album) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.albumStyleRules =
      relation('generateAlbumStyleRules', album, null);

    relations.albumLink =
      relation('linkAlbum', album);

    relations.albumNavAccent =
      relation('generateAlbumNavAccent', album, null);

    if (album.commentary) {
      if (album.hasCoverArt) {
        relations.albumCommentaryCover =
          relation('generateAlbumCoverArtwork', album);
      }

      relations.albumCommentaryContent =
        relation('transformContent', album.commentary);
    }

    const tracksWithCommentary =
      album.tracks
        .filter(({commentary}) => commentary);

    relations.trackCommentaryHeadings =
      tracksWithCommentary
        .map(() => relation('generateContentHeading'));

    relations.trackCommentaryLinks =
      tracksWithCommentary
        .map(track => relation('linkTrack', track));

    relations.trackCommentaryCovers =
      tracksWithCommentary
        .map(track =>
          (track.hasUniqueCoverArt
            ? relation('generateTrackCoverArtwork', track)
            : null));

    relations.trackCommentaryContent =
      tracksWithCommentary
        .map(track => relation('transformContent', track.commentary));

    relations.trackCommentaryColorVariables =
      tracksWithCommentary
        .map(track =>
          (track.color === album.color
            ? null
            : relation('generateColorStyleVariables')));

    relations.sidebarAlbumLink =
      relation('linkAlbum', album);

    relations.sidebarTrackSections =
      album.trackSections.map(trackSection =>
        relation('generateAlbumSidebarTrackSection', album, null, trackSection));

    return relations;
  },

  data(album) {
    const data = {};

    data.name = album.name;
    data.color = album.color;

    const tracksWithCommentary =
      album.tracks
        .filter(({commentary}) => commentary);

    const thingsWithCommentary =
      (album.commentary
        ? [album, ...tracksWithCommentary]
        : tracksWithCommentary);

    data.entryCount = thingsWithCommentary.length;

    data.wordCount =
      thingsWithCommentary
        .map(({commentary}) => commentary)
        .join(' ')
        .split(' ')
        .length;

    data.trackCommentaryDirectories =
      tracksWithCommentary
        .map(track => track.directory);

    data.trackCommentaryColors =
      tracksWithCommentary
        .map(track =>
          (track.color === album.color
            ? null
            : track.color));

    return data;
  },

  generate(data, relations, {html, language}) {
    return relations.layout
      .slots({
        title:
          language.$('albumCommentaryPage.title', {
            album: data.name,
          }),

        headingMode: 'sticky',

        color: data.color,
        styleRules: [relations.albumStyleRules],

        mainClasses: ['long-content'],
        mainContent: [
          html.tag('p',
            language.$('albumCommentaryPage.infoLine', {
              words:
                html.tag('b',
                  language.formatWordCount(data.wordCount, {unit: true})),

              entries:
                html.tag('b',
                  language.countCommentaryEntries(data.entryCount, {unit: true})),
            })),

          relations.albumCommentaryContent && [
            html.tag('h3',
              {class: ['content-heading']},
              language.$('albumCommentaryPage.entry.title.albumCommentary')),

            relations.albumCommentaryCover
              ?.slots({mode: 'commentary'}),

            html.tag('blockquote',
              relations.albumCommentaryContent),
          ],

          stitchArrays({
            heading: relations.trackCommentaryHeadings,
            link: relations.trackCommentaryLinks,
            directory: data.trackCommentaryDirectories,
            cover: relations.trackCommentaryCovers,
            content: relations.trackCommentaryContent,
            colorVariables: relations.trackCommentaryColorVariables,
            color: data.trackCommentaryColors,
          }).map(({heading, link, directory, cover, content, colorVariables, color}) => [
              heading.slots({
                tag: 'h3',
                id: directory,
                title: link,
              }),

              cover?.slots({mode: 'commentary'}),

              html.tag('blockquote',
                (color
                  ? {style: colorVariables.slot('color', color).content}
                  : {}),
                content),
            ]),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {
            html:
              relations.albumLink
                .slot('attributes', {class: 'current'}),

            accent:
              relations.albumNavAccent.slots({
                showTrackNavigation: false,
                showExtraLinks: true,
                currentExtra: 'commentary',
              }),
          },
        ],

        leftSidebarStickyMode: 'column',
        leftSidebarContent: [
          html.tag('h1', relations.sidebarAlbumLink),
          relations.sidebarTrackSections.map(section =>
            section.slots({
              anchor: true,
              open: true,
            })),
        ],
      });
  },
};
